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
    const doctorUsers = await this.db
      .select()
      .from(users)
      .where(eq(users.role, 'doctor'));

    const existingDoctorStaff = await this.db
      .select()
      .from(staff)
      .where(eq(staff.role, 'doctor'));

    // 2. Ensure every doctor user has a linked staff record (idempotent synchronization)
    const staffByUserId = new Map(existingDoctorStaff.filter((s) => s.userId).map((s) => [s.userId!, s]));

    for (const docUser of doctorUsers) {
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

    // 3. If there are strictly ZERO doctors in the clinic, seed the default Chief Doctor
    const recheckStaff = await this.db.select().from(staff).where(eq(staff.role, 'doctor'));
    if (recheckStaff.length === 0) {
      const chiefId = randomUUID();
      const now = new Date().toISOString();
      await this.db.insert(staff).values({
        id: chiefId,
        userId: null,
        fullName: 'ডাঃ মোঃ তৌফিক উজ জামান (Dr. Md. Toufiquzzaman)',
        role: 'doctor',
        phone: '+8801711000000',
        specialization: 'Chief Consultant & Physiotherapy Specialist',
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
        notes: 'Chief Consultant of Health & Pain Care Center · Jashore',
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Fetch rich doctor records joined with users and chambers (rooms)
    const doctorRows = await this.db
      .select({
        staff: staff,
        user: users,
        room: rooms,
      })
      .from(staff)
      .leftJoin(users, eq(staff.userId, users.id))
      .leftJoin(rooms, eq(staff.chamberRoomId, rooms.id))
      .where(eq(staff.role, 'doctor'))
      .orderBy(sql`COALESCE(${staff.fullName}, ${users.displayName}) ASC`);

    return doctorRows.map(({ staff: s, user: u, room: r }) => {
      const feePaisa = s.consultationFeePaisa ?? s.feeOverridePaisa ?? 50000;
      const followUpPaisa = s.followUpFeePaisa ?? 30000;
      const reportPaisa = s.reportFeePaisa ?? 0;

      let availableDays: string[] = DEFAULT_DAYS;
      if (s.availableDays) {
        try {
          const parsed = JSON.parse(s.availableDays);
          if (Array.isArray(parsed)) availableDays = parsed;
        } catch {
          availableDays = DEFAULT_DAYS;
        }
      }

      return {
        id: s.id,
        staffId: s.id,
        userId: s.userId ?? u?.id ?? null,
        linkedUser: u
          ? {
              id: u.id,
              email: u.email,
              role: u.role,
              displayName: u.displayName,
              phone: u.phone,
              isActive: u.isActive,
            }
          : null,
        fullName: s.fullName || u?.displayName || 'Doctor',
        displayName: u?.displayName || s.fullName,
        email: u?.email ?? null,
        phone: s.phone || u?.phone || null,
        role: 'doctor' as const,
        specialization: s.specialization || 'Consultant Specialist',
        qualifications: s.qualifications || 'BPT, PGD, MDMR, MPH',
        feeOverridePaisa: feePaisa,
        consultationFeePaisa: feePaisa,
        consultationFeeTaka: Math.round(feePaisa / 100),
        followUpFeePaisa: followUpPaisa,
        followUpFeeTaka: Math.round(followUpPaisa / 100),
        reportFeePaisa: reportPaisa,
        reportFeeTaka: Math.round(reportPaisa / 100),
        chamberRoomId: s.chamberRoomId ?? null,
        chamberRoom: r
          ? {
              id: r.id,
              roomNumber: r.roomNumber,
              name: r.name,
              type: r.type,
              status: r.status,
            }
          : null,
        dailyQuota: s.dailyQuota ?? 40,
        slotDurationMinutes: s.slotDurationMinutes ?? 15,
        dutyStartTime: s.dutyStartTime || '09:00 AM',
        dutyEndTime: s.dutyEndTime || '05:00 PM',
        availableDays,
        isActive: Boolean(s.isActive),
        notes: s.notes ?? null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
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

    const patch: Partial<typeof staff.$inferInsert> = {
      updatedAt: now,
    };

    if (dto.userId !== undefined) {
      patch.userId = dto.userId || null;
      if (dto.userId) {
        // Automatically ensure the linked user's role is set to doctor
        await this.db
          .update(users)
          .set({ role: 'doctor', updatedAt: now })
          .where(eq(users.id, dto.userId));
      }
    }

    if (dto.fullName !== undefined) patch.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) patch.phone = dto.phone.trim();
    if (dto.specialization !== undefined) patch.specialization = dto.specialization.trim();
    if (dto.qualifications !== undefined) patch.qualifications = dto.qualifications.trim();
    if (consultationFeePaisa !== undefined) {
      patch.consultationFeePaisa = consultationFeePaisa;
      patch.feeOverridePaisa = consultationFeePaisa;
    }
    if (followUpFeePaisa !== undefined) patch.followUpFeePaisa = followUpFeePaisa;
    if (reportFeePaisa !== undefined) patch.reportFeePaisa = reportFeePaisa;
    if (dto.chamberRoomId !== undefined) patch.chamberRoomId = dto.chamberRoomId || null;
    if (dto.dailyQuota !== undefined) patch.dailyQuota = dto.dailyQuota;
    if (dto.slotDurationMinutes !== undefined) patch.slotDurationMinutes = dto.slotDurationMinutes;
    if (dto.dutyStartTime !== undefined) patch.dutyStartTime = dto.dutyStartTime.trim();
    if (dto.dutyEndTime !== undefined) patch.dutyEndTime = dto.dutyEndTime.trim();
    if (dto.availableDays !== undefined) patch.availableDays = JSON.stringify(dto.availableDays);
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;
    if (dto.notes !== undefined) patch.notes = dto.notes?.trim() ?? null;

    // Update staff row
    await this.db.update(staff).set(patch).where(eq(staff.id, existing.id));

    // Also update linked user displayName / phone / active status if user exists
    if (existing.userId) {
      const userPatch: Partial<typeof users.$inferInsert> = { updatedAt: now };
      if (patch.fullName) userPatch.displayName = patch.fullName;
      if (patch.phone) userPatch.phone = patch.phone;
      if (patch.isActive !== undefined) userPatch.isActive = patch.isActive;
      await this.db.update(users).set(userPatch).where(eq(users.id, existing.userId));
    }

    const updated = await this.getDoctor(existing.id);

    // Emit realtime event
    this.gateway?.emit('clinic:global', 'doctor.updated', updated);
    this.realtime?.publish('doctor.updated', updated);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'doctor.update_config',
      entity: 'staff',
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

    // 1. If explicit userId is provided, link to existing user account
    if (dto.userId && dto.userId.trim()) {
      const existingUser = await this.db
        .select()
        .from(users)
        .where(eq(users.id, dto.userId.trim()));
      if (existingUser[0]) {
        linkedUserId = existingUser[0].id;
        // Ensure user has role doctor
        if (existingUser[0].role !== 'doctor') {
          await this.db
            .update(users)
            .set({ role: 'doctor', updatedAt: now })
            .where(eq(users.id, linkedUserId));
        }
      }
    } else if (dto.email && dto.email.trim()) {
      // 2. If email is provided, check if user exists or create new doctor user
      const email = dto.email.trim().toLowerCase();
      const existingUser = await this.db.select().from(users).where(eq(users.email, email));
      if (existingUser[0]) {
        linkedUserId = existingUser[0].id;
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
          isActive: 1,
          mustChangePassword: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const consultationFeePaisa =
      dto.consultationFeeTaka !== undefined
        ? dto.consultationFeeTaka * 100
        : dto.consultationFeePaisa ?? 50000;

    const followUpFeePaisa =
      dto.followUpFeeTaka !== undefined
        ? dto.followUpFeeTaka * 100
        : dto.followUpFeePaisa ?? 30000;

    const reportFeePaisa =
      dto.reportFeeTaka !== undefined
        ? dto.reportFeeTaka * 100
        : dto.reportFeePaisa ?? 0;

    const staffId = randomUUID();
    const newStaffRow = {
      id: staffId,
      userId: linkedUserId,
      fullName: dto.fullName.trim(),
      role: 'doctor' as const,
      phone: dto.phone?.trim() ?? null,
      specialization: dto.specialization?.trim() || 'Physiotherapy & Rehabilitation Specialist',
      qualifications: dto.qualifications?.trim() || 'BPT, PGD, MDMR, MPH',
      feeOverridePaisa: consultationFeePaisa,
      consultationFeePaisa: consultationFeePaisa,
      followUpFeePaisa: followUpFeePaisa,
      reportFeePaisa: reportFeePaisa,
      chamberRoomId: dto.chamberRoomId || 'room-doc-101',
      dailyQuota: dto.dailyQuota ?? 40,
      slotDurationMinutes: dto.slotDurationMinutes ?? 15,
      dutyStartTime: dto.dutyStartTime?.trim() || '09:00 AM',
      dutyEndTime: dto.dutyEndTime?.trim() || '05:00 PM',
      availableDays: JSON.stringify(dto.availableDays || DEFAULT_DAYS),
      notes: dto.notes?.trim() ?? null,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(staff).values(newStaffRow);

    const createdDoctor = await this.getDoctor(staffId);

    // Emit realtime event
    this.gateway?.emit('clinic:global', 'doctor.created', createdDoctor);
    this.realtime?.publish('doctor.created', createdDoctor);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'doctor.create',
      entity: 'staff',
      entityId: staffId,
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
