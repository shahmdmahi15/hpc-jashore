import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { modalities } from '../db/schema';
import type { CreateModalityDto, UpdateModalityDto } from './dto';

interface Actor {
  sub: string;
  role: string;
}

interface Meta {
  ip?: string | null;
  requestId?: string | null;
}

@Injectable()
export class CatalogService {
  constructor(@Inject(DB) private readonly db: Db, private readonly audit: AuditService) {}

  listModalities() {
    return this.db.select().from(modalities);
  }

  async createModality(actor: Actor, dto: CreateModalityDto, meta: Meta) {
    const existing = await this.db.select().from(modalities).where(eq(modalities.code, dto.code));
    if (existing.length > 0) throw new BadRequestException('Modality code already exists');
    const row = {
      id: randomUUID(),
      code: dto.code,
      nameEn: dto.nameEn,
      nameBn: dto.nameBn,
      defaultDurationMin: dto.defaultDurationMin,
      defaultPricePaisa: dto.defaultPricePaisa,
      isActive: 1,
    };
    await this.db.insert(modalities).values(row);
    await this.audit.log({
      actorUserId: actor.sub, actorRole: actor.role, action: 'modalities.create',
      entity: 'modalities', entityId: row.id, after: row, ip: meta.ip, requestId: meta.requestId,
    });
    return row;
  }

  async updateModality(actor: Actor, id: string, dto: UpdateModalityDto, meta: Meta) {
    const before = (await this.db.select().from(modalities).where(eq(modalities.id, id)))[0];
    if (!before) throw new BadRequestException('Modality not found');
    const patch: Partial<typeof modalities.$inferInsert> = {};
    if (dto.nameEn !== undefined) patch.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) patch.nameBn = dto.nameBn;
    if (dto.defaultDurationMin !== undefined) patch.defaultDurationMin = dto.defaultDurationMin;
    if (dto.defaultPricePaisa !== undefined) patch.defaultPricePaisa = dto.defaultPricePaisa;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;
    await this.db.update(modalities).set(patch).where(eq(modalities.id, id));
    const after = (await this.db.select().from(modalities).where(eq(modalities.id, id)))[0];
    await this.audit.log({
      actorUserId: actor.sub, actorRole: actor.role, action: 'modalities.update',
      entity: 'modalities', entityId: id, before, after, ip: meta.ip, requestId: meta.requestId,
    });
    return after;
  }
}
