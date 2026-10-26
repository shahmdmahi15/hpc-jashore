// apps/api/src/bulletins/bulletins.service.ts
import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { bulletins } from '../db/schema';
import { RealtimeService } from '../realtime/realtime.service';
import { EventsGateway } from '../realtime/events.gateway';
import { CreateBulletinDto, UpdateBulletinDto } from './dto';

@Injectable()
export class BulletinsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    @Optional() private readonly gateway?: EventsGateway,
  ) {}

  async listAll() {
    return this.db
      .select()
      .from(bulletins)
      .orderBy(desc(bulletins.priority), desc(bulletins.createdAt));
  }

  async listActive() {
    return this.db
      .select()
      .from(bulletins)
      .where(eq(bulletins.isActive, 1))
      .orderBy(desc(bulletins.priority), desc(bulletins.createdAt));
  }

  async create(
    actor: { sub: string; role: string },
    dto: CreateBulletinDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const [created] = await this.db
      .insert(bulletins)
      .values({
        id,
        title: dto.title,
        contentEn: dto.contentEn,
        contentBn: dto.contentBn,
        isUrgent: dto.isUrgent ? 1 : 0,
        isActive: dto.isActive !== false ? 1 : 0,
        priority: dto.priority ?? 0,
        createdBy: actor.sub,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'bulletins.create',
      entity: 'bulletins',
      entityId: id,
      after: created,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    try {
      const activeList = await this.listActive();
      this.realtime.publish('bulletin.created', { bulletin: created, activeBulletins: activeList });
      this.realtime.publish('tv:bulletins_updated', { activeBulletins: activeList });
      this.gateway?.emit('clinic:global', 'bulletin.created', { bulletin: created, activeBulletins: activeList });
      this.gateway?.emit('clinic:global', 'tv:bulletins_updated', { activeBulletins: activeList });
    } catch (_: any) {}

    return created;
  }

  async update(
    actor: { sub: string; role: string },
    id: string,
    dto: UpdateBulletinDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const [existing] = await this.db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id));

    if (!existing) {
      throw new NotFoundException('Bulletin not found');
    }

    const updates: Partial<typeof bulletins.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.contentEn !== undefined) updates.contentEn = dto.contentEn;
    if (dto.contentBn !== undefined) updates.contentBn = dto.contentBn;
    if (dto.isUrgent !== undefined) updates.isUrgent = dto.isUrgent ? 1 : 0;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive ? 1 : 0;
    if (dto.priority !== undefined) updates.priority = dto.priority;

    const [updated] = await this.db
      .update(bulletins)
      .set(updates)
      .where(eq(bulletins.id, id))
      .returning();

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'bulletins.update',
      entity: 'bulletins',
      entityId: id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    try {
      const activeList = await this.listActive();
      this.realtime.publish('bulletin.updated', { bulletin: updated, activeBulletins: activeList });
      this.realtime.publish('tv:bulletins_updated', { activeBulletins: activeList });
      this.gateway?.emit('clinic:global', 'bulletin.updated', { bulletin: updated, activeBulletins: activeList });
      this.gateway?.emit('clinic:global', 'tv:bulletins_updated', { activeBulletins: activeList });
    } catch (_: any) {}

    return updated;
  }

  async delete(
    actor: { sub: string; role: string },
    id: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const [existing] = await this.db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id));

    if (!existing) {
      throw new NotFoundException('Bulletin not found');
    }

    await this.db.delete(bulletins).where(eq(bulletins.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'bulletins.delete',
      entity: 'bulletins',
      entityId: id,
      before: existing,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    try {
      const activeList = await this.listActive();
      this.realtime.publish('bulletin.deleted', { id, activeBulletins: activeList });
      this.realtime.publish('tv:bulletins_updated', { activeBulletins: activeList });
      this.gateway?.emit('clinic:global', 'bulletin.deleted', { id, activeBulletins: activeList });
      this.gateway?.emit('clinic:global', 'tv:bulletins_updated', { activeBulletins: activeList });
    } catch (_: any) {}

    return { success: true };
  }
}
