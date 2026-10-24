import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, or, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { attendance, rooms, users } from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  CreateDoctorDto,
  CreateStaffDto,
  UpdateDoctorConfigDto,
  UpdateStaffDto,
} from './dto';

interface Actor {
  sub: string;
  role: string;
}

interface Meta {
  ip?: string | null;
  requestId?: string | null;
}

const DEFAULT_DAYS = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

@Injectable()
export class StaffService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    @Optional() private readonly gateway?: EventsGateway,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  async list() {
    const userRows = await this.db
      .select({
        user: users,
        chamber: rooms,
      })
      .from(users)
      .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
      .where(eq(users.isActive, 1));

    return userRows.map(({ user: u, chamber: c }) => ({
      id: u.id,
      userId: u.id,
      staffId: u.id,
      fullName: u.displayName,
      displayName: u.displayName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive === 1,
      specialization: u.specialization || (u.role === 'doctor' ? 'Consultant' : u.role),
      qualifications: u.qualifications,
      feeOverridePaisa: u.consultationFeePaisa ?? (u.role === 'doctor' ? 50000 : 0),
      consultationFeePaisa: u.consultationFeePaisa ?? (u.role === 'doctor' ? 50000 : 0),
      consultationFeeTaka: Math.round((u.consultationFeePaisa ?? (u.role === 'doctor' ? 50000 : 0)) / 100),
      followUpFeePaisa: u.followUpFeePaisa ?? 0,
      followUpFeeTaka: Math.round((u.followUpFeePaisa ?? 0) / 100),
      reportFeePaisa: u.reportFeePaisa ?? 0,
      reportFeeTaka: Math.round((u.reportFeePaisa ?? 0) / 100),
      chamberRoomId: u.chamberRoomId,
      chamberRoom: c
        ? {
            id: c.id,
            roomNumber: c.roomNumber,
            name: c.name,
            type: c.type,
            status: c.status,
          }
        : null,
      chamberName: c?.name ?? null,
      chamberRoomNumber: c?.roomNumber ?? null,
      defaultDeskId:
        u.role === 'receptionist'
          ? 'reception-1'
          : u.role === 'cashier'
            ? 'cashier-1'
            : 'consult-1',
    }));
  }

  // --- Doctor Consultation & Fee Configuration System -------------------------

  async listDoctors() {
    const doctorUsers = await this.db
      .select({
        user: users,
        room: rooms,
      })
      .from(users)
      .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
      .where(eq(users.role, 'doctor'))
      .orderBy(sql`${users.displayName} ASC`);

    return doctorUsers.map(({ user: u, room: r }) => {
      const consultationFeePaisa = u.consultationFeePaisa ?? 50000;
      const followUpFeePaisa = u.followUpFeePaisa ?? 0;
      const reportFeePaisa = u.reportFeePaisa ?? 0;

      let parsedAvailableDays: string[] = DEFAULT_DAYS;
      if (u.availableDays) {
        try {
          parsedAvailableDays = JSON.parse(u.availableDays);
        } catch {
          parsedAvailableDays = DEFAULT_DAYS;
        }
      }

      return {
        id: u.id,
        staffId: u.id,
        userId: u.id,
        fullName: u.displayName,
        displayName: u.displayName,
        email: u.email,
        phone: u.phone || null,
        role: 'doctor' as const,
        specialization: u.specialization || 'Physiotherapy & Rehabilitation Specialist',
        qualifications: u.qualifications || 'Consultant',
        feeOverridePaisa: consultationFeePaisa,
        consultationFeePaisa,
        consultationFeeTaka: Math.round(consultationFeePaisa / 100),
        followUpFeePaisa,
        followUpFeeTaka: Math.round(followUpFeePaisa / 100),
        reportFeePaisa,
        reportFeeTaka: Math.round(reportFeePaisa / 100),
        chamberRoomId: u.chamberRoomId ?? null,
        chamberRoom: r
          ? {
              id: r.id,
              roomNumber: r.roomNumber,
              name: r.name,
              type: r.type,
              status: r.status,
            }
          : null,
        chamberName: r?.name || null,
        chamberRoomNumber: r?.roomNumber || null,
        dailyQuota: u.dailyQuota ?? 40,
        slotDurationMinutes: u.slotDurationMinutes ?? 15,
        dutyStartTime: u.dutyStartTime || '09:00 AM',
        dutyEndTime: u.dutyEndTime || '05:00 PM',
        availableDays: parsedAvailableDays,
        notes: u.notes || null,
        isActive: u.isActive === 1,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });
  }

  async getDoctor(id: string) {
    const doctors = await this.listDoctors();
    const doc = doctors.find((d) => d.id === id || d.staffId === id || d.userId === id);
    if (!doc) throw new NotFoundException('Doctor not found');
    return doc;
  }

  async updateDoctor(
    actor: Actor,
    id: string,
    dto: UpdateDoctorConfigDto,
    meta: Meta,
  ) {
    const existing = await this.getDoctor(id);
    const now = new Date().toISOString();

    const consultationFeePaisa =
      dto.consultationFeeTaka !== undefined
        ? dto.consultationFeeTaka * 100
        : dto.consultationFeePaisa;

    const followUpFeePaisa =
      dto.followUpFeeTaka !== undefined
        ? dto.followUpFeeTaka * 100
        : dto.followUpFeePaisa;

    const reportFeePaisa =
      dto.reportFeeTaka !== undefined
        ? dto.reportFeeTaka * 100
        : dto.reportFeePaisa;

    const userPatch: Partial<typeof users.$inferInsert> = {
      updatedAt: now,
    };
    const nameToUse = (dto.displayName || dto.fullName)?.trim();
    if (nameToUse !== undefined) userPatch.displayName = nameToUse;
    if (dto.phone !== undefined) userPatch.phone = dto.phone.trim();
    if (consultationFeePaisa !== undefined) userPatch.consultationFeePaisa = consultationFeePaisa;
    if (followUpFeePaisa !== undefined) userPatch.followUpFeePaisa = followUpFeePaisa;
    if (reportFeePaisa !== undefined) userPatch.reportFeePaisa = reportFeePaisa;
    if (dto.chamberRoomId !== undefined) userPatch.chamberRoomId = dto.chamberRoomId || null;
    if (dto.specialization !== undefined) userPatch.specialization = dto.specialization?.trim() || null;
    if (dto.qualifications !== undefined) userPatch.qualifications = dto.qualifications?.trim() || null;
    if (dto.dailyQuota !== undefined) userPatch.dailyQuota = dto.dailyQuota;
    if (dto.slotDurationMinutes !== undefined) userPatch.slotDurationMinutes = dto.slotDurationMinutes;
    if (dto.dutyStartTime !== undefined) userPatch.dutyStartTime = dto.dutyStartTime;
    if (dto.dutyEndTime !== undefined) userPatch.dutyEndTime = dto.dutyEndTime;
    if (dto.availableDays !== undefined) {
      userPatch.availableDays = Array.isArray(dto.availableDays)
        ? JSON.stringify(dto.availableDays)
        : dto.availableDays;
    }
    if (dto.notes !== undefined) userPatch.notes = dto.notes;
    if (dto.isActive !== undefined) userPatch.isActive = dto.isActive ? 1 : 0;

    await this.db
      .update(users)
      .set(userPatch)
      .where(eq(users.id, existing.userId || existing.id));

    const updated = await this.getDoctor(existing.id);

    // Emit realtime event
    this.gateway?.emit('clinic:global', 'doctor.updated', updated);
    this.realtime?.publish('doctor.updated', updated);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'doctor.update_config',
      entity: 'users',
      entityId: existing.id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return updated;
  }

  async createDoctor(
    actor: Actor,
    dto: CreateDoctorDto,
    meta: Meta,
  ) {
    const now = new Date().toISOString();
    let linkedUserId: string | null = null;

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

    // 1. If explicit userId is provided, assign fees and chamber on existing user account
    if (dto.userId && dto.userId.trim()) {
      const existingUser = await this.db
        .select()
        .from(users)
        .where(eq(users.id, dto.userId.trim()));
      if (existingUser[0]) {
        linkedUserId = existingUser[0].id;
        await this.db
          .update(users)
          .set({
            role: 'doctor',
            displayName: (dto.displayName || dto.fullName)?.trim() || existingUser[0].displayName,
            phone: dto.phone?.trim() || existingUser[0].phone,
            consultationFeePaisa,
            followUpFeePaisa,
            reportFeePaisa,
            chamberRoomId: dto.chamberRoomId || existingUser[0].chamberRoomId,
            specialization: dto.specialization?.trim() || existingUser[0].specialization || 'Physiotherapy & Rehabilitation Specialist',
            qualifications: dto.qualifications?.trim() || existingUser[0].qualifications || 'Consultant',
            dailyQuota: dto.dailyQuota ?? existingUser[0].dailyQuota ?? 40,
            slotDurationMinutes: dto.slotDurationMinutes ?? existingUser[0].slotDurationMinutes ?? 15,
            dutyStartTime: dto.dutyStartTime ?? existingUser[0].dutyStartTime ?? '09:00 AM',
            dutyEndTime: dto.dutyEndTime ?? existingUser[0].dutyEndTime ?? '05:00 PM',
            availableDays: dto.availableDays
              ? (Array.isArray(dto.availableDays) ? JSON.stringify(dto.availableDays) : dto.availableDays)
              : existingUser[0].availableDays ?? JSON.stringify(DEFAULT_DAYS),
            notes: dto.notes ?? existingUser[0].notes ?? null,
            updatedAt: now,
          })
          .where(eq(users.id, linkedUserId));
      }
    } else if (dto.email && dto.email.trim()) {
      // 2. If email is provided, create new doctor user account directly
      const email = dto.email.trim().toLowerCase();
      const existingUser = await this.db.select().from(users).where(eq(users.email, email));
      if (existingUser[0]) {
        linkedUserId = existingUser[0].id;
        await this.db
          .update(users)
          .set({
            role: 'doctor',
            displayName: (dto.displayName || dto.fullName).trim(),
            phone: dto.phone?.trim() ?? existingUser[0].phone,
            consultationFeePaisa,
            followUpFeePaisa,
            reportFeePaisa,
            chamberRoomId: dto.chamberRoomId || null,
            specialization: dto.specialization?.trim() || existingUser[0].specialization || 'Physiotherapy & Rehabilitation Specialist',
            qualifications: dto.qualifications?.trim() || existingUser[0].qualifications || 'Consultant',
            dailyQuota: dto.dailyQuota ?? 40,
            slotDurationMinutes: dto.slotDurationMinutes ?? 15,
            dutyStartTime: dto.dutyStartTime ?? '09:00 AM',
            dutyEndTime: dto.dutyEndTime ?? '05:00 PM',
            availableDays: dto.availableDays
              ? (Array.isArray(dto.availableDays) ? JSON.stringify(dto.availableDays) : dto.availableDays)
              : JSON.stringify(DEFAULT_DAYS),
            notes: dto.notes ?? null,
            updatedAt: now,
          })
          .where(eq(users.id, linkedUserId));
      } else {
        const password = dto.password?.trim() || 'Doctor1234#';
        linkedUserId = randomUUID();
        await this.db.insert(users).values({
          id: linkedUserId,
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: 'doctor',
          displayName: (dto.displayName || dto.fullName).trim(),
          phone: dto.phone?.trim() ?? null,
          consultationFeePaisa,
          followUpFeePaisa,
          reportFeePaisa,
          chamberRoomId: dto.chamberRoomId || null,
          specialization: dto.specialization?.trim() || 'Physiotherapy & Rehabilitation Specialist',
          qualifications: dto.qualifications?.trim() || 'Consultant',
          dailyQuota: dto.dailyQuota ?? 40,
          slotDurationMinutes: dto.slotDurationMinutes ?? 15,
          dutyStartTime: dto.dutyStartTime ?? '09:00 AM',
          dutyEndTime: dto.dutyEndTime ?? '05:00 PM',
          availableDays: dto.availableDays
            ? (Array.isArray(dto.availableDays) ? JSON.stringify(dto.availableDays) : dto.availableDays)
            : JSON.stringify(DEFAULT_DAYS),
          notes: dto.notes ?? null,
          isActive: 1,
          mustChangePassword: 1,
          isApproved: 1,
          approvalStatus: 'approved',
          approvedAt: now,
          approvedBy: actor.sub,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const doctorUserId = linkedUserId || randomUUID();
    const createdDoctor = await this.getDoctor(doctorUserId);

    // Emit realtime event
    this.gateway?.emit('clinic:global', 'doctor.created', createdDoctor);
    this.realtime?.publish('doctor.created', createdDoctor);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'doctor.create',
      entity: 'users',
      entityId: doctorUserId,
      after: createdDoctor,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return createdDoctor;
  }

  // --- General Staff methods --------------------------------------------------

  async get(id: string) {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    if (!rows[0]) throw new NotFoundException('User not found');
    return {
      id: rows[0].id,
      userId: rows[0].id,
      staffId: rows[0].id,
      fullName: rows[0].displayName,
      displayName: rows[0].displayName,
      email: rows[0].email,
      role: rows[0].role,
      phone: rows[0].phone,
      specialization: rows[0].specialization || (rows[0].role === 'doctor' ? 'Consultant' : rows[0].role),
      isActive: rows[0].isActive === 1,
    };
  }

  async staffIdForUser(userId: string): Promise<string> {
    return userId;
  }

  async create(actor: Actor, dto: CreateStaffDto, meta: Meta) {
    const now = new Date().toISOString();
    const id = dto.userId ?? randomUUID();
    const row = {
      id,
      email: `${dto.role}-${id.slice(0, 8)}@internal.clinic`,
      passwordHash: await bcrypt.hash('StaffDefault123#', 10),
      role: dto.role,
      displayName: dto.fullName,
      phone: dto.phone ?? null,
      specialization: dto.specialization ?? null,
      consultationFeePaisa: dto.feeOverridePaisa ?? (dto.role === 'doctor' ? 50000 : 0),
      isActive: 1,
      mustChangePassword: 1,
      isApproved: 1,
      approvalStatus: 'approved' as const,
      approvedAt: now,
      approvedBy: actor.sub,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(users).values(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'staff.create',
      entity: 'users',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return {
      id: row.id,
      userId: row.id,
      staffId: row.id,
      fullName: row.displayName,
      role: row.role,
      phone: row.phone,
      isActive: true,
    };
  }

  async update(actor: Actor, id: string, dto: UpdateStaffDto, meta: Meta) {
    const before = await this.get(id);
    const patch: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (dto.fullName !== undefined) patch.displayName = dto.fullName;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.specialization !== undefined) patch.specialization = dto.specialization;
    if (dto.feeOverridePaisa !== undefined) {
      patch.consultationFeePaisa = dto.feeOverridePaisa;
    }
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;
    await this.db.update(users).set(patch).where(eq(users.id, id));
    const after = await this.get(id);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'staff.update',
      entity: 'users',
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
      note: pin ? 'Punched at workstation' : null,
    };
    await this.db.insert(attendance).values(row);
    return { success: true, attendanceId: row.id, punchType, timestamp: row.timestamp };
  }
}
