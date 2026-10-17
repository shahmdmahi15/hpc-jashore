import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { staff } from '../db/schema';
import type { CreateStaffDto, UpdateStaffDto } from './dto';

interface Actor {
  sub: string;
  role: string;
}

interface Meta {
  ip?: string | null;
  requestId?: string | null;
}

@Injectable()
export class StaffService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.db.select().from(staff);
  }

  async get(id: string) {
    const rows = await this.db.select().from(staff).where(eq(staff.id, id));
    if (!rows[0]) throw new NotFoundException('Staff not found');
    return rows[0];
  }

  async staffIdForUser(userId: string): Promise<string | null> {
    const rows = await this.db.select().from(staff).where(eq(staff.userId, userId));
    return rows[0]?.id ?? null;
  }

  async create(actor: Actor, dto: CreateStaffDto, meta: Meta) {
    const row = {
      id: randomUUID(),
      userId: dto.userId ?? null,
      fullName: dto.fullName,
      role: dto.role,
      phone: dto.phone ?? null,
      specialization: dto.specialization ?? null,
      feeOverridePaisa: dto.feeOverridePaisa ?? null,
      isActive: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db.insert(staff).values(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'staff.create',
      entity: 'staff',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return row;
  }

  async update(actor: Actor, id: string, dto: UpdateStaffDto, meta: Meta) {
    const before = await this.get(id);
    const patch: Partial<typeof staff.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.specialization !== undefined) patch.specialization = dto.specialization;
    if (dto.feeOverridePaisa !== undefined) patch.feeOverridePaisa = dto.feeOverridePaisa;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;
    await this.db.update(staff).set(patch).where(eq(staff.id, id));
    const after = await this.get(id);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'staff.update',
      entity: 'staff',
      entityId: id,
      before,
      after,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return after;
  }
}
