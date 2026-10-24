import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, desc, eq, isNull, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { refreshSessions, rooms, staff, users } from '../db/schema';
import { RealtimeService } from '../realtime/realtime.service';
import { EventsGateway } from '../realtime/events.gateway';
import type { CreateUserDto, UpdateUserDto } from './dto';

const DEFAULT_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

function sanitize(row: typeof users.$inferSelect) {
  const { passwordHash: _drop, ...rest } = row;
  void _drop;
  return {
    ...rest,
    consultationFeeTaka: Math.round((row.consultationFeePaisa ?? 50000) / 100),
    followUpFeeTaka: Math.round((row.followUpFeePaisa ?? 0) / 100),
    reportFeeTaka: Math.round((row.reportFeePaisa ?? 0) / 100),
  };
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    @Optional() private readonly gateway?: EventsGateway,
  ) {}

  async list() {
    const rows = await this.db
      .select({
        user: users,
        chamber: rooms,
      })
      .from(users)
      .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
      .orderBy(asc(users.displayName));

    return rows.map(({ user, chamber }) => ({
      ...sanitize(user),
      chamberRoom: chamber
        ? {
            id: chamber.id,
            roomNumber: chamber.roomNumber,
            name: chamber.name,
            type: chamber.type,
            status: chamber.status,
          }
        : null,
      chamberName: chamber?.name ?? null,
      chamberRoomNumber: chamber?.roomNumber ?? null,
    }));
  }

  async create(actor: { sub: string; role: string }, dto: CreateUserDto, meta: { ip?: string | null; requestId?: string | null }) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) throw new BadRequestException('Email already in use');
    const now = new Date().toISOString();

    const consultationFeePaisa =
      dto.consultationFeeTaka !== undefined
        ? dto.consultationFeeTaka * 100
        : (dto.consultationFeePaisa ?? 50000);
    const followUpFeePaisa =
      dto.followUpFeeTaka !== undefined
        ? dto.followUpFeeTaka * 100
        : (dto.followUpFeePaisa ?? 0);
    const reportFeePaisa =
      dto.reportFeeTaka !== undefined
        ? dto.reportFeeTaka * 100
        : (dto.reportFeePaisa ?? 0);

    const row = {
      id: randomUUID(),
      email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      displayName: dto.displayName.trim(),
      phone: dto.phone?.trim() ?? null,
      isActive: 1,
      mustChangePassword: 1,
      consultationFeePaisa,
      followUpFeePaisa,
      reportFeePaisa,
      chamberRoomId: dto.chamberRoomId?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(users).values(row);

    // If role is doctor, automatically sync corresponding staff record for compatibility
    let createdDoctorStaff: any = null;
    if (dto.role === 'doctor') {
      const staffRow = {
        id: row.id,
        userId: row.id,
        fullName: row.displayName,
        role: 'doctor' as const,
        phone: row.phone,
        specialization: null,
        qualifications: null,
        feeOverridePaisa: consultationFeePaisa,
        consultationFeePaisa,
        followUpFeePaisa,
        reportFeePaisa,
        chamberRoomId: row.chamberRoomId,
        dailyQuota: 40,
        slotDurationMinutes: 15,
        dutyStartTime: '09:00 AM',
        dutyEndTime: '05:00 PM',
        availableDays: JSON.stringify(DEFAULT_DAYS),
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.insert(staff).values(staffRow);
      createdDoctorStaff = {
        ...staffRow,
        consultationFeeTaka: Math.round(consultationFeePaisa / 100),
        followUpFeeTaka: Math.round(followUpFeePaisa / 100),
        reportFeeTaka: Math.round(reportFeePaisa / 100),
        availableDays: DEFAULT_DAYS,
      };
    }

    const sanitized = sanitize(row);

    // Broadcast realtime synchronization
    this.realtime.publish('user.created', sanitized);
    this.gateway?.emit('clinic:global', 'user.created', sanitized);

    if (createdDoctorStaff) {
      this.realtime.publish('doctor.created', createdDoctorStaff);
      this.gateway?.emit('clinic:global', 'doctor.created', createdDoctorStaff);
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'users.create',
      entity: 'users',
      entityId: row.id,
      after: sanitized,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return sanitized;
  }

  async get(id: string) {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    if (!rows[0]) throw new NotFoundException('User not found');
    return sanitize(rows[0]);
  }

  async update(actor: { sub: string; role: string }, id: string, dto: UpdateUserDto, meta: { ip?: string | null; requestId?: string | null }) {
    const before = await this.get(id);
    const now = new Date().toISOString();
    const patch: Partial<typeof users.$inferInsert> = { updatedAt: now };
    if (dto.displayName !== undefined) patch.displayName = dto.displayName.trim();
    if (dto.phone !== undefined) patch.phone = dto.phone.trim();
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;
    if (dto.password !== undefined) {
      patch.passwordHash = await bcrypt.hash(dto.password, 10);
      patch.mustChangePassword = 1;
    }
    if (dto.consultationFeeTaka !== undefined) {
      patch.consultationFeePaisa = dto.consultationFeeTaka * 100;
    } else if (dto.consultationFeePaisa !== undefined) {
      patch.consultationFeePaisa = dto.consultationFeePaisa;
    }
    if (dto.followUpFeeTaka !== undefined) {
      patch.followUpFeePaisa = dto.followUpFeeTaka * 100;
    } else if (dto.followUpFeePaisa !== undefined) {
      patch.followUpFeePaisa = dto.followUpFeePaisa;
    }
    if (dto.reportFeeTaka !== undefined) {
      patch.reportFeePaisa = dto.reportFeeTaka * 100;
    } else if (dto.reportFeePaisa !== undefined) {
      patch.reportFeePaisa = dto.reportFeePaisa;
    }
    if (dto.chamberRoomId !== undefined) {
      patch.chamberRoomId = dto.chamberRoomId ? dto.chamberRoomId.trim() : null;
    }

    await this.db.update(users).set(patch).where(eq(users.id, id));
    const after = await this.get(id);

    // Keep linked staff record synced
    const linkedStaff = await this.db.select().from(staff).where(or(eq(staff.userId, id), eq(staff.id, id)));
    if (linkedStaff.length > 0) {
      const staffPatch: Partial<typeof staff.$inferInsert> = { updatedAt: now };
      if (patch.displayName) staffPatch.fullName = patch.displayName;
      if (patch.phone !== undefined) staffPatch.phone = patch.phone;
      if (patch.isActive !== undefined) staffPatch.isActive = patch.isActive;
      if (patch.role) staffPatch.role = patch.role;
      if (patch.consultationFeePaisa !== undefined) {
        staffPatch.consultationFeePaisa = patch.consultationFeePaisa;
        staffPatch.feeOverridePaisa = patch.consultationFeePaisa;
      }
      if (patch.followUpFeePaisa !== undefined) staffPatch.followUpFeePaisa = patch.followUpFeePaisa;
      if (patch.reportFeePaisa !== undefined) staffPatch.reportFeePaisa = patch.reportFeePaisa;
      if (patch.chamberRoomId !== undefined) staffPatch.chamberRoomId = patch.chamberRoomId;

      await this.db.update(staff).set(staffPatch).where(or(eq(staff.userId, id), eq(staff.id, id)));

      this.realtime.publish('doctor.updated', { id, userId: id, ...staffPatch });
      this.gateway?.emit('clinic:global', 'doctor.updated', { id, userId: id, ...staffPatch });
    } else if (dto.role === 'doctor' || after.role === 'doctor') {
      const staffRow = {
        id,
        userId: id,
        fullName: after.displayName,
        role: 'doctor' as const,
        phone: after.phone,
        consultationFeePaisa: after.consultationFeePaisa ?? 50000,
        feeOverridePaisa: after.consultationFeePaisa ?? 50000,
        followUpFeePaisa: after.followUpFeePaisa ?? 0,
        reportFeePaisa: after.reportFeePaisa ?? 0,
        chamberRoomId: after.chamberRoomId,
        isActive: after.isActive,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.insert(staff).values(staffRow);
      this.realtime.publish('doctor.created', staffRow);
      this.gateway?.emit('clinic:global', 'doctor.created', staffRow);
    }

    // Broadcast user update
    this.realtime.publish('user.updated', after);
    this.gateway?.emit('clinic:global', 'user.updated', after);

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
    const now = new Date().toISOString();
    await this.db.update(users).set({ isActive: 0, updatedAt: now }).where(eq(users.id, id));
    const linked = await this.db.select().from(staff).where(eq(staff.userId, id));
    for (const s of linked) {
      await this.db.update(staff).set({ isActive: 0, updatedAt: now }).where(eq(staff.id, s.id));
    }

    // Broadcast user disable
    this.realtime.publish('user.disabled', { id, isActive: 0 });
    this.gateway?.emit('clinic:global', 'user.disabled', { id, isActive: 0 });
    this.realtime.publish('doctor.updated', { userId: id, isActive: 0 });
    this.gateway?.emit('clinic:global', 'doctor.updated', { userId: id, isActive: 0 });

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

  async listSessions() {
    const rows = await this.db
      .select({
        id: refreshSessions.id,
        userId: refreshSessions.userId,
        deviceLabel: refreshSessions.deviceLabel,
        ip: refreshSessions.ip,
        userAgent: refreshSessions.userAgent,
        expiresAt: refreshSessions.expiresAt,
        createdAt: refreshSessions.createdAt,
        userDisplayName: users.displayName,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(refreshSessions)
      .innerJoin(users, eq(refreshSessions.userId, users.id))
      .where(isNull(refreshSessions.revokedAt))
      .orderBy(desc(refreshSessions.createdAt));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      deviceLabel: r.deviceLabel,
      ip: r.ip,
      userAgent: r.userAgent,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      user: {
        displayName: r.userDisplayName,
        email: r.userEmail,
        role: r.userRole,
      },
    }));
  }

  async revokeSession(
    actor: { sub: string; role: string },
    sessionId: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const [existing] = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.id, sessionId));

    if (!existing) {
      throw new NotFoundException('Session not found');
    }

    const now = new Date().toISOString();
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: now })
      .where(eq(refreshSessions.id, sessionId));

    this.realtime.publish('session.revoked', { id: sessionId, userId: existing.userId });
    this.gateway?.emit('clinic:global', 'session.revoked', { id: sessionId, userId: existing.userId });

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'users.session_revoked',
      entity: 'refreshSessions',
      entityId: sessionId,
      before: existing,
      after: { ...existing, revokedAt: now },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, message: 'Session revoked successfully' };
  }
}
