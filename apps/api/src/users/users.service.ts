import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { staff, users } from '../db/schema';
import type { CreateUserDto, UpdateUserDto } from './dto';

function sanitize(row: typeof users.$inferSelect) {
  const { passwordHash: _drop, ...rest } = row;
  void _drop;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db, private readonly audit: AuditService) {}

  async list() {
    const rows = await this.db.select().from(users);
    return rows.map(sanitize);
  }

  async create(actor: { sub: string; role: string }, dto: CreateUserDto, meta: { ip?: string | null; requestId?: string | null }) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) throw new BadRequestException('Email already in use');
    const row = {
      id: randomUUID(),
      email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      displayName: dto.displayName,
      isActive: 1,
      mustChangePassword: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db.insert(users).values(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'users.create',
      entity: 'users',
      entityId: row.id,
      after: sanitize(row),
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return sanitize(row);
  }

  async get(id: string) {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    if (!rows[0]) throw new NotFoundException('User not found');
    return sanitize(rows[0]);
  }

  async update(actor: { sub: string; role: string }, id: string, dto: UpdateUserDto, meta: { ip?: string | null; requestId?: string | null }) {
    const before = await this.get(id);
    const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (dto.displayName !== undefined) patch.displayName = dto.displayName;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;
    if (dto.password !== undefined) {
      patch.passwordHash = await bcrypt.hash(dto.password, 10);
      patch.mustChangePassword = 1;
    }
    await this.db.update(users).set(patch).where(eq(users.id, id));
    const after = await this.get(id);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'users.update',
      entity: 'users',
      entityId: id,
      before,
      after,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return after;
  }

  // Soft-disable: never hard-delete (audit trail + FK safety).
  async remove(actor: { sub: string; role: string }, id: string, meta: { ip?: string | null; requestId?: string | null }) {
    const before = await this.get(id);
    await this.db.update(users).set({ isActive: 0, updatedAt: new Date().toISOString() }).where(eq(users.id, id));
    const linked = await this.db.select().from(staff).where(eq(staff.userId, id));
    for (const s of linked) {
      await this.db.update(staff).set({ isActive: 0 }).where(eq(staff.id, s.id));
    }
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'users.disable',
      entity: 'users',
      entityId: id,
      before,
      after: { ...before, isActive: 0 },
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return { ok: true };
  }
}
