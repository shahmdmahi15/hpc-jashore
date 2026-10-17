import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { desks } from '../db/schema';
import type { CreateDeskDto, UpdateDeskDto } from './dto';

@Injectable()
export class DesksService {
  constructor(@Inject(DB) private readonly db: Db, private readonly audit: AuditService) {}

  list() {
    return this.db.select().from(desks);
  }

  async create(actor: { sub: string; role: string }, dto: CreateDeskDto, meta: { ip?: string | null; requestId?: string | null }) {
    const existing = await this.db.select().from(desks).where(eq(desks.code, dto.code));
    if (existing.length > 0) throw new BadRequestException('Desk code already exists');
    const row = {
      id: randomUUID(),
      code: dto.code,
      type: dto.type,
      name: dto.name,
      roomId: dto.roomId ?? null,
      isActive: 1,
    };
    await this.db.insert(desks).values(row);
    await this.audit.log({
      actorUserId: actor.sub, actorRole: actor.role, action: 'desks.create',
      entity: 'desks', entityId: row.id, after: row, ip: meta.ip, requestId: meta.requestId,
    });
    return row;
  }

  async update(actor: { sub: string; role: string }, id: string, dto: UpdateDeskDto, meta: { ip?: string | null; requestId?: string | null }) {
    const before = (await this.db.select().from(desks).where(eq(desks.id, id)))[0];
    if (!before) throw new BadRequestException('Desk not found');
    const patch: Partial<typeof desks.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.roomId !== undefined) patch.roomId = dto.roomId;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;
    await this.db.update(desks).set(patch).where(eq(desks.id, id));
    const after = (await this.db.select().from(desks).where(eq(desks.id, id)))[0];
    await this.audit.log({
      actorUserId: actor.sub, actorRole: actor.role, action: 'desks.update',
      entity: 'desks', entityId: id, before, after, ip: meta.ip, requestId: meta.requestId,
    });
    return after;
  }
}
