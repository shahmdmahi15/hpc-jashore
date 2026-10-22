import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { attendance, users, staff } from '../db/schema';
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

  async list() {
    const userRows = await this.db
      .select({
        id: users.id,
        userId: users.id,
        fullName: users.displayName,
        displayName: users.displayName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.isActive, 1));

    return userRows.map((u) => ({
      ...u,
      specialization: u.role === 'doctor' ? 'Consultant' : u.role,
      feeOverridePaisa: 0,
      defaultDeskId: u.role === 'receptionist' ? 'reception-1' : u.role === 'cashier' ? 'cashier-1' : 'consult-1',
    }));
  }

  async get(id: string) {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    if (rows[0]) {
      return {
        id: rows[0].id,
        userId: rows[0].id,
        fullName: rows[0].displayName,
        role: rows[0].role,
        phone: rows[0].phone,
        specialization: rows[0].role === 'doctor' ? 'Consultant' : rows[0].role,
        isActive: rows[0].isActive,
      };
    }
    const legacyRows = await this.db.select().from(staff).where(eq(staff.id, id));
    if (!legacyRows[0]) throw new NotFoundException('User/Staff not found');
    return legacyRows[0];
  }

  async staffIdForUser(userId: string): Promise<string | null> {
    return userId;
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

  async recordAttendance(
    staffId: string,
    punchType: 'in' | 'out',
    deskId?: string,
    pin?: string,
    ip?: string,
  ) {
    await this.get(staffId);
    const row = {
      id: randomUUID(),
      staffId,
      punchType,
      deskId: deskId ?? null,
      timestamp: new Date().toISOString(),
      ip: ip ?? null,
      note: pin ? 'Punched with desk PIN' : null,
    };
    await this.db.insert(attendance).values(row);
    return { success: true, attendanceId: row.id, punchType, timestamp: row.timestamp };
  }
}
