import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, desc, eq, isNull, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { refreshSessions, rooms, users } from '../db/schema';
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

  async listPending() {
    const rows = await this.db
      .select({
        user: users,
        chamber: rooms,
      })
      .from(users)
      .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
      .where(or(eq(users.isApproved, 0), eq(users.approvalStatus, 'pending')))
      .orderBy(desc(users.createdAt));

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

  async approve(
    actor: { sub: string; role: string },
    id: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const before = await this.get(id);
    const now = new Date().toISOString();

    await this.db
      .update(users)
      .set({
        isApproved: 1,
        approvalStatus: 'approved',
        approvedAt: now,
        approvedBy: actor.sub,
        rejectionReason: null,
        isActive: 1,
        updatedAt: now,
      })
      .where(eq(users.id, id));

    const after = await this.get(id);

    this.realtime.publish('user.approved', { userId: id, approvedBy: actor.sub, approvedAt: now, user: after });
    this.gateway?.emit('clinic:global', 'user.approved', { userId: id, approvedBy: actor.sub, user: after });

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'users.approve',
      entity: 'users',
      entityId: id,
      before,
      after,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, message: 'User approved successfully / ব্যবহারকারী সফলভাবে অনুমোদিত হয়েছে', user: after };
  }

  async reject(
    actor: { sub: string; role: string },
    id: string,
    reason: string | undefined,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const before = await this.get(id);
    const now = new Date().toISOString();
    const rejectionReason = reason?.trim() || 'Account registration rejected by administrator';

    await this.db
      .update(users)
      .set({
        isApproved: 0,
        approvalStatus: 'rejected',
        rejectionReason,
        isActive: 0,
        updatedAt: now,
      })
      .where(eq(users.id, id));

    // Revoke any active sessions immediately
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: now })
      .where(eq(refreshSessions.userId, id));

    const after = await this.get(id);

    this.realtime.publish('user.rejected', { userId: id, reason: rejectionReason, rejectedBy: actor.sub });
    this.gateway?.emit('clinic:global', 'user.rejected', { userId: id, reason: rejectionReason });

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'users.reject',
      entity: 'users',
      entityId: id,
      before,
      after,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, message: 'User registration rejected / ব্যবহারকারীর আবেদন বাতিল করা হয়েছে', user: after };
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

    const isApproved = dto.isApproved !== undefined ? (dto.isApproved ? 1 : 0) : 0;
    const approvalStatus = dto.approvalStatus || (isApproved === 1 ? 'approved' : 'pending');
    const approvedAt = isApproved === 1 ? now : null;
    const approvedBy = isApproved === 1 ? actor.sub : null;

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
      specialization: dto.specialization?.trim() || (dto.role === 'doctor' ? 'Consultant' : null),
      qualifications: dto.qualifications?.trim() || null,
      dailyQuota: dto.dailyQuota ?? 40,
      slotDurationMinutes: dto.slotDurationMinutes ?? 15,
      dutyStartTime: dto.dutyStartTime ?? '09:00 AM',
      dutyEndTime: dto.dutyEndTime ?? '05:00 PM',
      availableDays: dto.availableDays
        ? (Array.isArray(dto.availableDays) ? JSON.stringify(dto.availableDays) : dto.availableDays)
        : JSON.stringify(DEFAULT_DAYS),
      customTimeSlots: dto.customTimeSlots
        ? (Array.isArray(dto.customTimeSlots) ? JSON.stringify(dto.customTimeSlots) : dto.customTimeSlots)
        : null,
      notes: dto.notes ?? null,
      isApproved,
      approvalStatus,
      approvedAt,
      approvedBy,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(users).values(row);

    const sanitized = sanitize(row);

    // Broadcast realtime synchronization
    this.realtime.publish('user.created', sanitized);
    this.gateway?.emit('clinic:global', 'user.created', sanitized);

    if (dto.role === 'doctor') {
      this.realtime.publish('doctor.created', sanitized);
      this.gateway?.emit('clinic:global', 'doctor.created', sanitized);
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
    if (dto.phone !== undefined) patch.phone = dto.phone ? dto.phone.trim() : null;
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
    if (dto.isApproved !== undefined) {
      patch.isApproved = dto.isApproved ? 1 : 0;
      if (dto.isApproved) {
        patch.approvalStatus = 'approved';
        patch.approvedAt = now;
        patch.approvedBy = actor.sub;
      } else {
        patch.approvalStatus = 'pending';
      }
    }
    if (dto.approvalStatus !== undefined) {
      patch.approvalStatus = dto.approvalStatus;
      patch.isApproved = dto.approvalStatus === 'approved' ? 1 : 0;
      if (dto.approvalStatus === 'approved') {
        patch.approvedAt = now;
        patch.approvedBy = actor.sub;
      }
    }
    if (dto.rejectionReason !== undefined) {
      patch.rejectionReason = dto.rejectionReason;
    }
    if (dto.specialization !== undefined) patch.specialization = dto.specialization?.trim() || null;
    if (dto.qualifications !== undefined) patch.qualifications = dto.qualifications?.trim() || null;
    if (dto.dailyQuota !== undefined) patch.dailyQuota = dto.dailyQuota;
    if (dto.slotDurationMinutes !== undefined) patch.slotDurationMinutes = dto.slotDurationMinutes;
    if (dto.dutyStartTime !== undefined) patch.dutyStartTime = dto.dutyStartTime;
    if (dto.dutyEndTime !== undefined) patch.dutyEndTime = dto.dutyEndTime;
    if (dto.availableDays !== undefined) {
      patch.availableDays = Array.isArray(dto.availableDays)
        ? JSON.stringify(dto.availableDays)
        : dto.availableDays;
    }
    if (dto.customTimeSlots !== undefined) {
      patch.customTimeSlots = Array.isArray(dto.customTimeSlots)
        ? JSON.stringify(dto.customTimeSlots)
        : dto.customTimeSlots;
    }
    if (dto.notes !== undefined) patch.notes = dto.notes;

    await this.db.update(users).set(patch).where(eq(users.id, id));
    const after = await this.get(id);

    if (after.role === 'doctor' || dto.role === 'doctor') {
      this.realtime.publish('doctor.updated', after);
      this.gateway?.emit('clinic:global', 'doctor.updated', after);
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

    // Broadcast user disable
    this.realtime.publish('user.disabled', { id, isActive: 0 });
    this.gateway?.emit('clinic:global', 'user.disabled', { id, isActive: 0 });
    if (before.role === 'doctor') {
      this.realtime.publish('doctor.updated', { id, userId: id, isActive: 0 });
      this.gateway?.emit('clinic:global', 'doctor.updated', { id, userId: id, isActive: 0 });
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
