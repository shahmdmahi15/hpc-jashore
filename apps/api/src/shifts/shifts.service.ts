import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, gte, lte } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { shifts } from '../db/schema';
import type { CreateShiftDto, UpdateShiftDto } from './dto';

@Injectable()
export class ShiftsService {
  constructor(@Inject(DB) private readonly db: Db, private readonly audit: AuditService) {}

  listForDate(date?: string) {
    if (!date) return this.db.select().from(shifts);
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    return this.db
      .select()
      .from(shifts)
      .where(and(gte(shifts.startsAt, start), lte(shifts.startsAt, end)));
  }

  async create(actor: { sub: string; role: string }, dto: CreateShiftDto, meta: { ip?: string | null; requestId?: string | null }) {
    const row = {
      id: randomUUID(),
      staffId: dto.staffId,
      deskId: dto.deskId ?? null,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt ?? null,
      status: dto.status ?? 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db.insert(shifts).values(row);
    await this.audit.log({
      actorUserId: actor.sub, actorRole: actor.role, action: 'shifts.create',
      entity: 'shifts', entityId: row.id, after: row, ip: meta.ip, requestId: meta.requestId,
    });
    return row;
  }

  async update(actor: { sub: string; role: string }, id: string, dto: UpdateShiftDto, meta: { ip?: string | null; requestId?: string | null }) {
    const before = (await this.db.select().from(shifts).where(eq(shifts.id, id)))[0];
    if (!before) throw new BadRequestException('Shift not found');
    const patch: Partial<typeof shifts.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (dto.endsAt !== undefined) patch.endsAt = dto.endsAt;
    if (dto.status !== undefined) patch.status = dto.status;
    await this.db.update(shifts).set(patch).where(eq(shifts.id, id));
    const after = (await this.db.select().from(shifts).where(eq(shifts.id, id)))[0];
    await this.audit.log({
      actorUserId: actor.sub, actorRole: actor.role, action: 'shifts.update',
      entity: 'shifts', entityId: id, before, after, ip: meta.ip, requestId: meta.requestId,
    });
    return after;
  }

  async remove(actor: { sub: string; role: string }, id: string, meta: { ip?: string | null; requestId?: string | null }) {
    const before = (await this.db.select().from(shifts).where(eq(shifts.id, id)))[0];
    if (!before) throw new BadRequestException('Shift not found');
    await this.db.delete(shifts).where(eq(shifts.id, id));
    await this.audit.log({
      actorUserId: actor.sub, actorRole: actor.role, action: 'shifts.delete',
      entity: 'shifts', entityId: id, before, ip: meta.ip, requestId: meta.requestId,
    });
    return { ok: true };
  }
}
