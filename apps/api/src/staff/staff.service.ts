import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { attendance, rooms, staff, users } from '../db/schema';
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
    const staffRows = await this.db
      .select({
        staff: staff,
        user: users,
      })
      .from(staff)
      .leftJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.isActive, 1));

    if (staffRows.length === 0) {
      const userRows = await this.db
        .select()
        .from(users)
        .where(eq(users.isActive, 1));

      return userRows.map((u) => ({
        id: u.id,
        userId: u.id,
        fullName: u.displayName,
        displayName: u.displayName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        specialization: u.role === 'doctor' ? 'Consultant' : u.role,
        feeOverridePaisa: u.role === 'doctor' ? 50000 : 0,
        consultationFeePaisa: u.role === 'doctor' ? 50000 : 0,
        defaultDeskId:
          u.role === 'receptionist'
            ? 'reception-1'
            : u.role === 'cashier'
              ? 'cashier-1'
              : 'consult-1',
      }));
    }

    return staffRows.map(({ staff: s, user: u }) => ({
      id: s.id,
      userId: s.userId ?? u?.id ?? null,
      fullName: s.fullName,
      displayName: u?.displayName || s.fullName,
      email: u?.email ?? null,
      phone: s.phone || u?.phone || null,
      role: s.role,
      isActive: s.isActive,
      specialization: s.specialization || (s.role === 'doctor' ? 'Consultant' : s.role),
      feeOverridePaisa: s.feeOverridePaisa ?? s.consultationFeePaisa ?? (s.role === 'doctor' ? 50000 : 0),
      consultationFeePaisa: s.consultationFeePaisa ?? s.feeOverridePaisa ?? (s.role === 'doctor' ? 50000 : 0),
      defaultDeskId:
        s.role === 'receptionist'
          ? 'reception-1'
          : s.role === 'cashier'
            ? 'cashier-1'
            : 'consult-1',
    }));
  }

  // --- Doctor Consultation & Fee Configuration System -------------------------

  async listDoctors() {
    // 1. Fetch all doctors from staff & users
    const allDoctorUsers = await this.db
      .select()
      .from(users)
      .where(eq(users.role, 'doctor'));

    const existingDoctorStaff = await this.db
      .select()
      .from(staff)
      .where(eq(staff.role, 'doctor'));

    // 2. Ensure every doctor user has a linked staff record (idempotent synchronization)
    const staffByUserId = new Map(existingDoctorStaff.filter((s) => s.userId).map((s) => [s.userId!, s]));

    for (const docUser of allDoctorUsers) {
      if (!staffByUserId.has(docUser.id)) {
        const newStaffId = randomUUID();
        const now = new Date().toISOString();
        await this.db.insert(staff).values({
          id: newStaffId,
          userId: docUser.id,
          fullName: docUser.displayName,
          role: 'doctor',
          phone: docUser.phone ?? null,
          specialization: 'Physiotherapy & Rehabilitation Specialist',
          qualifications: 'BPT, PGD, MDMR, MPH',
          feeOverridePaisa: 50000,
          consultationFeePaisa: 50000,
          followUpFeePaisa: 30000,
          reportFeePaisa: 0,
          chamberRoomId: 'room-doc-101',
          dailyQuota: 40,
          slotDurationMinutes: 15,
          dutyStartTime: '09:00 AM',
          dutyEndTime: '05:00 PM',
          availableDays: JSON.stringify(DEFAULT_DAYS),
          isActive: docUser.isActive,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 3. Clean up any orphaned legacy dummy staff doctor rows without a user account
    await this.db.delete(staff).where(and(eq(staff.role, 'doctor'), isNull(staff.userId)));

    // 4. Fetch rich doctor records directly from users table joined with chambers (rooms)
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

      return {
        id: u.id,
        staffId: u.id,
        userId: u.id,
        fullName: u.displayName,
        displayName: u.displayName,
        email: u.email,
        phone: u.phone || null,
        role: 'doctor' as const,
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
    if (dto.fullName !== undefined) userPatch.displayName = dto.fullName.trim();
    if (dto.phone !== undefined) userPatch.phone = dto.phone.trim();
    if (consultationFeePaisa !== undefined) userPatch.consultationFeePaisa = consultationFeePaisa;
    if (followUpFeePaisa !== undefined) userPatch.followUpFeePaisa = followUpFeePaisa;
    if (reportFeePaisa !== undefined) userPatch.reportFeePaisa = reportFeePaisa;
    if (dto.chamberRoomId !== undefined) userPatch.chamberRoomId = dto.chamberRoomId || null;
    if (dto.isActive !== undefined) userPatch.isActive = dto.isActive ? 1 : 0;

    await this.db
      .update(users)
      .set(userPatch)
      .where(or(eq(users.id, existing.userId || existing.id), eq(users.id, id)));

    // Keep staff row synced for backwards compatibility
    const staffRows = await this.db
      .select()
      .from(staff)
      .where(or(eq(staff.userId, existing.userId || existing.id), eq(staff.id, id)));

    if (staffRows.length > 0) {
      await this.db
        .update(staff)
        .set({
          fullName: userPatch.displayName,
          phone: userPatch.phone,
          consultationFeePaisa: userPatch.consultationFeePaisa,
          feeOverridePaisa: userPatch.consultationFeePaisa,
          followUpFeePaisa: userPatch.followUpFeePaisa,
          reportFeePaisa: userPatch.reportFeePaisa,
          chamberRoomId: userPatch.chamberRoomId,
          isActive: userPatch.isActive,
          updatedAt: now,
        })
        .where(or(eq(staff.userId, existing.userId || existing.id), eq(staff.id, id)));
    } else {
      await this.db.insert(staff).values({
        id: existing.userId || id,
        userId: existing.userId || id,
        fullName: userPatch.displayName || existing.fullName,
        role: 'doctor',
        phone: userPatch.phone || existing.phone,
        consultationFeePaisa: userPatch.consultationFeePaisa ?? 50000,
        feeOverridePaisa: userPatch.consultationFeePaisa ?? 50000,
        followUpFeePaisa: userPatch.followUpFeePaisa ?? 0,
        reportFeePaisa: userPatch.reportFeePaisa ?? 0,
        chamberRoomId: userPatch.chamberRoomId ?? null,
        isActive: userPatch.isActive ?? 1,
        createdAt: now,
        updatedAt: now,
      });
    }

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
            displayName: dto.fullName?.trim() || existingUser[0].displayName,
            phone: dto.phone?.trim() || existingUser[0].phone,
            consultationFeePaisa,
            followUpFeePaisa,
            reportFeePaisa,
            chamberRoomId: dto.chamberRoomId || existingUser[0].chamberRoomId,
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
            displayName: dto.fullName.trim(),
            phone: dto.phone?.trim() ?? existingUser[0].phone,
            consultationFeePaisa,
            followUpFeePaisa,
            reportFeePaisa,
            chamberRoomId: dto.chamberRoomId || null,
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
          displayName: dto.fullName.trim(),
          phone: dto.phone?.trim() ?? null,
          consultationFeePaisa,
          followUpFeePaisa,
          reportFeePaisa,
          chamberRoomId: dto.chamberRoomId || null,
          isActive: 1,
          mustChangePassword: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const doctorUserId = linkedUserId || randomUUID();

    // Ensure synced staff record exists
    const staffRows = await this.db
      .select()
      .from(staff)
      .where(or(eq(staff.userId, doctorUserId), eq(staff.id, doctorUserId)));

    if (staffRows.length === 0) {
      await this.db.insert(staff).values({
        id: doctorUserId,
        userId: doctorUserId,
        fullName: dto.fullName.trim(),
        role: 'doctor' as const,
        phone: dto.phone?.trim() ?? null,
        consultationFeePaisa,
        feeOverridePaisa: consultationFeePaisa,
        followUpFeePaisa,
        reportFeePaisa,
        chamberRoomId: dto.chamberRoomId || null,
        dailyQuota: 40,
        slotDurationMinutes: 15,
        dutyStartTime: '09:00 AM',
        dutyEndTime: '05:00 PM',
        availableDays: JSON.stringify(DEFAULT_DAYS),
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await this.db
        .update(staff)
        .set({
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() ?? staffRows[0].phone,
          consultationFeePaisa,
          feeOverridePaisa: consultationFeePaisa,
          followUpFeePaisa,
          reportFeePaisa,
          chamberRoomId: dto.chamberRoomId || staffRows[0].chamberRoomId,
          updatedAt: now,
        })
        .where(eq(staff.id, staffRows[0].id));
    }

    const createdDoctor = await this.getDoctor(doctorUserId);

    // Emit realtime event
    this.gateway?.emit('clinic:global', 'doctor.created', createdDoctor);
    this.realtime?.publish('doctor.created', createdDoctor);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'doctor.create',
      entity: 'staff',
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
    const s = await this.db.select().from(staff).where(eq(staff.userId, userId));
    return s[0]?.id ?? userId;
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
      consultationFeePaisa: dto.feeOverridePaisa ?? null,
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
    if (dto.feeOverridePaisa !== undefined) {
      patch.feeOverridePaisa = dto.feeOverridePaisa;
      patch.consultationFeePaisa = dto.feeOverridePaisa;
    }
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
