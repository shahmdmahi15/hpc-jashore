import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { tvDevices } from '../db/schema';
import { RealtimeService } from '../realtime/realtime.service';
import type { HeartbeatTvDto, PairTvDto, RegisterTvDto, UpdateTvDto } from './dto';

@Injectable()
export class TvService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
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

    return {
      id: newId,
      pairingCode: code,
      status: 'pending',
      deviceName: newRecord.deviceName,
      department: 'ALL',
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
      secretToken: row.status === 'paired' ? row.secretToken : null,
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

    return {
      id: row.id,
      pairingCode: row.pairingCode,
      status: 'paired',
      paired: true,
      deviceName: row.deviceName,
      department: row.department,
      location: row.location,
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

    this.realtime.publish('tv:paired', {
      id: targetId!,
      pairingCode: code,
      deviceName: dto.deviceName,
      department: dto.department || 'ALL',
      status: 'paired',
    });

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

    this.realtime.publish('tv:updated', { id, device: updated });

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

    this.realtime.publish('tv:revoked', { id, pairingCode: existing.pairingCode });

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

    this.realtime.publish('tv:deleted', { id, pairingCode: existing.pairingCode });

    return { ok: true };
  }
}
