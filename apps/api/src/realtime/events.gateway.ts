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
import { refreshSessions, shifts, users } from '../db/schema';

// Socket.IO gateway: slim events only ({ id, ...refs }); clients refetch REST.
// Rooms: clinic:global, role:{role}, user:{userId}, tv:{pairingCode}, doctor:{staffId}, room:{deskRoomId}.
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
      if (payload.type !== 'access' || typeof payload.sid !== 'string') return null;
      return payload;
    } catch {
      return null;
    }
  }

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    const pairingCode =
      (client.handshake.auth?.pairingCode as string | undefined) ??
      (client.handshake.query?.pairingCode as string | undefined);

    // Support TV screen connections directly via pairing code
    if (pairingCode && typeof pairingCode === 'string') {
      const normalizedCode = pairingCode.trim().toUpperCase();
      await client.join('clinic:global');
      await client.join(`tv:${normalizedCode}`);
      client.emit('connected', { tv: normalizedCode, rooms: Array.from(client.rooms) });
      return;
    }

    const payload = await this.verify(token);
    if (!payload || typeof payload.sid !== 'string') {
      client.disconnect(true);
      return;
    }

    // Stateful DB Session verification
    const [session] = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.id, payload.sid));

    if (!session || session.revokedAt !== null || new Date(session.expiresAt).getTime() < Date.now()) {
      client.disconnect(true);
      return;
    }

    // Stateful DB User verification
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));

    if (!user || user.isActive !== 1 || user.isApproved !== 1 || user.approvalStatus !== 'approved') {
      client.disconnect(true);
      return;
    }

    const role = user.role;
    const staffId = user.id;
    client.data.user = { sub: user.id, email: user.email, role, staffId, sid: session.id };

    await client.join('clinic:global');
    await client.join(`role:${role}`);
    await client.join(`user:${user.id}`);
    await client.join(`session:${session.id}`);

    if (role === 'doctor') {
      await client.join(`doctor:${user.id}`);
    }

    const activeShifts = await this.db
      .select()
      .from(shifts)
      .where(and(eq(shifts.staffId, user.id), eq(shifts.status, 'active')));
    const deskId = activeShifts[0]?.deskId;
    if (deskId) await client.join(`room:${deskId}`);

    client.emit('connected', {
      user: { id: user.id, role, email: user.email },
      rooms: Array.from(client.rooms),
    });
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
