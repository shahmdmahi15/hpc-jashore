import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { bulletins, tvDevices } from '../db/schema';
import { RealtimeService } from '../realtime/realtime.service';
import { EventsGateway } from '../realtime/events.gateway';
import type { HeartbeatTvDto, PairTvDto, RegisterTvDto, UpdateTvDto } from './dto';

@Injectable()
export class TvService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    @Optional() private readonly gateway?: EventsGateway,
  ) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  async registerTv(dto: RegisterTvDto, meta: { ip?: string | null }) {
    const code = this.normalizeCode(dto.pairingCode);
    const [existing] = await this.db.select().from(tvDevices).where(eq(tvDevices.pairingCode, code));
    const now = new Date().toISOString();

    if (existing) {
      await this.db
        .update(tvDevices)
        .set({
          lastSeenAt: now,
          ipAddress: meta.ip || existing.ipAddress,
          appVersion: dto.appVersion || existing.appVersion,
          updatedAt: now,
        })
        .where(eq(tvDevices.id, existing.id));

      return {
        id: existing.id,
        pairingCode: existing.pairingCode,
        status: existing.status,
        deviceName: existing.deviceName,
        department: existing.department,
        theme: existing.theme || 'dark',
        language: existing.language || 'bn',
        secretToken: existing.status === 'paired' ? existing.secretToken : null,
      };
    }

    const newId = randomUUID();
    const newRecord = {
      id: newId,
      pairingCode: code,
      deviceName: dto.deviceName || `TV Display ${code}`,
      location: null,
      department: 'ALL',
      theme: 'dark',
      language: 'bn',
      status: 'pending',
      secretToken: null,
      ipAddress: meta.ip || null,
      appVersion: dto.appVersion || null,
      lastSeenAt: now,
      pairedAt: null,
      pairedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(tvDevices).values(newRecord);

    this.realtime.publish('tv:registered', {
      id: newId,
      pairingCode: code,
      deviceName: newRecord.deviceName,
      status: 'pending',
    });
    this.gateway?.emit('clinic:global', 'tv:registered', {
      id: newId,
      pairingCode: code,
      deviceName: newRecord.deviceName,
      status: 'pending',
    });

    return {
      id: newId,
      pairingCode: code,
      status: 'pending',
      deviceName: newRecord.deviceName,
      department: 'ALL',
      theme: 'dark',
      language: 'bn',
      secretToken: null,
    };
  }

  async getTvStatus(pairingCode: string) {
    const code = this.normalizeCode(pairingCode);
    const [row] = await this.db.select().from(tvDevices).where(eq(tvDevices.pairingCode, code));

    if (!row) {
      return {
        status: 'unregistered',
        pairingCode: code,
        deviceName: null,
        department: 'ALL',
        theme: 'dark',
        language: 'bn',
        secretToken: null,
      };
    }

    return {
      id: row.id,
      pairingCode: row.pairingCode,
      status: row.status,
      deviceName: row.deviceName,
      department: row.department,
      location: row.location,
      theme: row.theme || 'dark',
      language: row.language || 'bn',
      secretToken: row.status === 'paired' ? row.secretToken : null,
      forceUpdate: row.forceUpdate === 1,
    };
  }

  async heartbeat(dto: HeartbeatTvDto, meta: { ip?: string | null }) {
    if (!dto.pairingCode) {
      throw new BadRequestException('pairingCode is required for heartbeat');
    }
    const code = this.normalizeCode(dto.pairingCode);
    const [row] = await this.db.select().from(tvDevices).where(eq(tvDevices.pairingCode, code));

    if (!row) {
      return {
        status: 'unregistered',
        paired: false,
        pairingCode: code,
        theme: 'dark',
        language: 'bn',
      };
    }

    if (row.status !== 'paired') {
      return {
        id: row.id,
        pairingCode: row.pairingCode,
        status: row.status,
        paired: false,
        deviceName: row.deviceName,
        department: row.department,
        location: row.location,
        theme: row.theme || 'dark',
        language: row.language || 'bn',
      };
    }

    const now = new Date().toISOString();
    await this.db
      .update(tvDevices)
      .set({
        lastSeenAt: now,
        ipAddress: meta.ip || row.ipAddress,
        appVersion: dto.appVersion || row.appVersion,
        updatedAt: now,
      })
      .where(eq(tvDevices.id, row.id));

    // Emit live heartbeat event for zero-latency online indicators
    this.realtime.publish('tv:heartbeat', {
      id: row.id,
      pairingCode: row.pairingCode,
      deviceName: row.deviceName,
      isOnline: true,
      lastSeenAt: now,
    });
    this.gateway?.emit('clinic:global', 'tv:heartbeat', {
      id: row.id,
      pairingCode: row.pairingCode,
      isOnline: true,
    });

    return {
      id: row.id,
      pairingCode: row.pairingCode,
      status: 'paired',
      paired: true,
      deviceName: row.deviceName,
      department: row.department,
      location: row.location,
      theme: row.theme || 'dark',
      language: row.language || 'bn',
      forceUpdate: row.forceUpdate === 1,
    };
  }

  async listDevices() {
    const rows = await this.db.select().from(tvDevices).orderBy(desc(tvDevices.createdAt));
    const nowMs = Date.now();
    const ONLINE_THRESHOLD_MS = 45 * 1000; // 45 seconds

    return rows.map((r) => {
      const lastSeenMs = r.lastSeenAt ? new Date(r.lastSeenAt).getTime() : 0;
      const isOnline = nowMs - lastSeenMs < ONLINE_THRESHOLD_MS;
      return {
        ...r,
        isOnline,
      };
    });
  }

  async pairDevice(
    actor: { sub: string; role: string },
    dto: PairTvDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const code = this.normalizeCode(dto.pairingCode);
    const [existing] = await this.db.select().from(tvDevices).where(eq(tvDevices.pairingCode, code));

    const now = new Date().toISOString();
    const token = randomUUID();

    let targetId = existing?.id;

    if (!existing) {
      targetId = randomUUID();
      await this.db.insert(tvDevices).values({
        id: targetId,
        pairingCode: code,
        deviceName: dto.deviceName,
        location: dto.location || null,
        department: dto.department || 'ALL',
        theme: dto.theme || 'dark',
        language: dto.language || 'bn',
        status: 'paired',
        secretToken: token,
        ipAddress: meta.ip || null,
        appVersion: null,
        lastSeenAt: now,
        pairedAt: now,
        pairedBy: actor.sub,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await this.db
        .update(tvDevices)
        .set({
          deviceName: dto.deviceName,
          location: dto.location || existing.location,
          department: dto.department || existing.department || 'ALL',
          theme: dto.theme || existing.theme || 'dark',
          language: dto.language || existing.language || 'bn',
          status: 'paired',
          secretToken: token,
          pairedAt: now,
          pairedBy: actor.sub,
          updatedAt: now,
        })
        .where(eq(tvDevices.id, existing.id));
    }

    const [updated] = await this.db.select().from(tvDevices).where(eq(tvDevices.id, targetId!));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'tv.paired',
      entity: 'tv_devices',
      entityId: targetId!,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    const pairPayload = {
      id: targetId!,
      pairingCode: code,
      deviceName: dto.deviceName,
      department: dto.department || 'ALL',
      theme: updated?.theme || 'dark',
      language: updated?.language || 'bn',
      status: 'paired',
      secretToken: token,
    };

    this.realtime.publish('tv:paired', pairPayload);
    this.gateway?.emit('clinic:global', 'tv:paired', pairPayload);
    this.gateway?.emit(`tv:${code}`, 'tv:paired', pairPayload);

    return {
      ...updated,
      isOnline: true,
    };
  }

  async updateDevice(
    actor: { sub: string; role: string },
    id: string,
    dto: UpdateTvDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const [existing] = await this.db.select().from(tvDevices).where(eq(tvDevices.id, id));
    if (!existing) {
      throw new NotFoundException('TV device not found');
    }

    const now = new Date().toISOString();
    const patch: Partial<typeof tvDevices.$inferInsert> = { updatedAt: now };

    if (dto.deviceName !== undefined) patch.deviceName = dto.deviceName;
    if (dto.department !== undefined) patch.department = dto.department;
    if (dto.theme !== undefined) patch.theme = dto.theme;
    if (dto.language !== undefined) patch.language = dto.language;
    if (dto.location !== undefined) patch.location = dto.location;
    if (dto.status !== undefined) patch.status = dto.status;

    await this.db.update(tvDevices).set(patch).where(eq(tvDevices.id, id));
    const [updated] = await this.db.select().from(tvDevices).where(eq(tvDevices.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'tv.updated',
      entity: 'tv_devices',
      entityId: id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    const updatePayload = {
      id,
      pairingCode: existing.pairingCode,
      device: updated,
      deviceName: updated.deviceName,
      department: updated.department,
      theme: updated.theme,
      language: updated.language,
      location: updated.location,
    };

    this.realtime.publish('tv:updated', updatePayload);
    this.gateway?.emit('clinic:global', 'tv:updated', updatePayload);
    this.gateway?.emit(`tv:${existing.pairingCode}`, 'tv:updated', updatePayload);

    return updated;
  }

  async revokeDevice(
    actor: { sub: string; role: string },
    id: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const [existing] = await this.db.select().from(tvDevices).where(eq(tvDevices.id, id));
    if (!existing) {
      throw new NotFoundException('TV device not found');
    }

    const now = new Date().toISOString();
    await this.db
      .update(tvDevices)
      .set({
        status: 'revoked',
        secretToken: null,
        updatedAt: now,
      })
      .where(eq(tvDevices.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'tv.revoked',
      entity: 'tv_devices',
      entityId: id,
      before: existing,
      after: { ...existing, status: 'revoked', secretToken: null },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    const revokePayload = { id, pairingCode: existing.pairingCode, status: 'revoked' };
    this.realtime.publish('tv:revoked', revokePayload);
    this.gateway?.emit('clinic:global', 'tv:revoked', revokePayload);
    this.gateway?.emit(`tv:${existing.pairingCode}`, 'tv:revoked', revokePayload);

    return { ok: true, status: 'revoked' };
  }

  async deleteDevice(
    actor: { sub: string; role: string },
    id: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const [existing] = await this.db.select().from(tvDevices).where(eq(tvDevices.id, id));
    if (!existing) {
      throw new NotFoundException('TV device not found');
    }

    await this.db.delete(tvDevices).where(eq(tvDevices.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'tv.deleted',
      entity: 'tv_devices',
      entityId: id,
      before: existing,
      after: null,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    const deletePayload = { id, pairingCode: existing.pairingCode, status: 'deleted' };
    this.realtime.publish('tv:deleted', deletePayload);
    this.gateway?.emit('clinic:global', 'tv:deleted', deletePayload);
    this.gateway?.emit(`tv:${existing.pairingCode}`, 'tv:deleted', deletePayload);

    return { ok: true };
  }

  async setForceUpdate(
    actor: { sub: string; role: string },
    id: string,
    force: boolean,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const [existing] = await this.db.select().from(tvDevices).where(eq(tvDevices.id, id));
    if (!existing) {
      throw new NotFoundException('TV device not found');
    }

    const now = new Date().toISOString();
    const [updated] = await this.db
      .update(tvDevices)
      .set({
        forceUpdate: force ? 1 : 0,
        updatedAt: now,
      })
      .where(eq(tvDevices.id, id))
      .returning();

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: force ? 'tv.force_update_enabled' : 'tv.force_update_disabled',
      entity: 'tv_devices',
      entityId: id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    this.realtime.publish('tv:updated', {
      id: updated.id,
      pairingCode: updated.pairingCode,
      forceUpdate: updated.forceUpdate === 1,
    });

    return updated;
  }

  async getActiveBulletins() {
    return this.db
      .select()
      .from(bulletins)
      .where(eq(bulletins.isActive, 1))
      .orderBy(desc(bulletins.priority), desc(bulletins.createdAt));
  }
}
