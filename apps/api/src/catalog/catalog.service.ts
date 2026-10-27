import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { modalities, therapySessions } from '../db/schema';
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
    return this.db.select().from(modalities).orderBy(modalities.code);
  }

  async createModality(actor: Actor, dto: CreateModalityDto, meta: Meta) {
    const existing = await this.db.select().from(modalities).where(eq(modalities.code, dto.code));
    if (existing.length > 0) throw new BadRequestException('Modality code already exists');
    const row = {
      id: randomUUID(),
      code: dto.code.trim().toUpperCase(),
      nameEn: dto.nameEn.trim(),
      nameBn: dto.nameBn.trim(),
      defaultDurationMin: dto.defaultDurationMin,
      defaultPricePaisa: dto.defaultPricePaisa,
      isActive: 1,
    };
    await this.db.insert(modalities).values(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'modalities.create',
      entity: 'modalities',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return row;
  }

  async updateModality(actor: Actor, id: string, dto: UpdateModalityDto, meta: Meta) {
    const before = (await this.db.select().from(modalities).where(eq(modalities.id, id)))[0];
    if (!before) throw new NotFoundException('Modality not found');
    const patch: Partial<typeof modalities.$inferInsert> = {};
    if (dto.nameEn !== undefined) patch.nameEn = dto.nameEn.trim();
    if (dto.nameBn !== undefined) patch.nameBn = dto.nameBn.trim();
    if (dto.defaultDurationMin !== undefined) patch.defaultDurationMin = dto.defaultDurationMin;
    if (dto.defaultPricePaisa !== undefined) patch.defaultPricePaisa = dto.defaultPricePaisa;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;
    await this.db.update(modalities).set(patch).where(eq(modalities.id, id));
    const after = (await this.db.select().from(modalities).where(eq(modalities.id, id)))[0];
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'modalities.update',
      entity: 'modalities',
      entityId: id,
      before,
      after,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return after;
  }

  async deleteModality(actor: Actor, id: string, meta: Meta) {
    const before = (await this.db.select().from(modalities).where(eq(modalities.id, id)))[0];
    if (!before) throw new NotFoundException('Modality not found');

    const sessions = await this.db
      .select({ id: therapySessions.id })
      .from(therapySessions)
      .where(eq(therapySessions.modalityCode, before.code))
      .limit(1);

    if (sessions.length > 0) {
      await this.db
        .update(modalities)
        .set({ isActive: 0 })
        .where(eq(modalities.id, id));

      const after = (await this.db.select().from(modalities).where(eq(modalities.id, id)))[0];

      await this.audit.log({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'modalities.delete',
        entity: 'modalities',
        entityId: id,
        before,
        after,
        ip: meta.ip,
        requestId: meta.requestId,
      });

      return {
        ok: true,
        softDeleted: true,
        message: 'Modality deactivated due to existing therapy session history',
      };
    }

    await this.db.delete(modalities).where(eq(modalities.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'modalities.delete',
      entity: 'modalities',
      entityId: id,
      before,
      after: null,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      ok: true,
      softDeleted: false,
      message: 'Modality deleted successfully',
    };
  }
}
