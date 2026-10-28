import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  billItems,
  bills,
  modalities,
  packageCredits,
  packages,
  patients,
  patientTimelineEvents,
  rooms,
  staff,
  therapyPlans,
  therapySessions,
  therapySlotBookings,
  users,
  visits,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  CallTherapyPatientDto,
  CancelTherapyCallDto,
  CompleteSessionDto,
  CreatePackageDto,
  CreateTherapyPlansDto,
  MarkInTherapyDto,
  PurchasePackageDto,
  RecallTherapyPatientDto,
  SendToCashierDto,
  StartSessionDto,
  SwitchTherapyRoomDto,
} from './dto';

@Injectable()
export class TherapyService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly gateway: EventsGateway,
    private readonly realtime: RealtimeService,
  ) {}

  async startSession(
    actor: { sub?: string; role?: string },
    therapistStaffId: string,
    dto: StartSessionDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const patientRows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId));
    if (!patientRows[0]) throw new NotFoundException('Patient not found');

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // 0. Ensure foreign key target tables exist in SQLite so FK checks never fail
    try {
      (this.db as any).session?.client?.exec(`
        CREATE TABLE IF NOT EXISTS machines (id TEXT PRIMARY KEY NOT NULL, name TEXT, modality_code TEXT, is_active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS beds (id TEXT PRIMARY KEY NOT NULL, name TEXT, is_active INTEGER NOT NULL DEFAULT 1);
      `);
    } catch {}

    // 1. Ensure modality exists in database so foreign key never fails
    const modCode = (dto.modalityCode || 'IFT').trim();
    const modRow = await this.db.select().from(modalities).where(eq(modalities.code, modCode));
    if (!modRow[0]) {
      try {
        await this.db.insert(modalities).values({
          id: `mod-${modCode.toLowerCase()}`,
          code: modCode,
          nameEn: `${modCode} Therapy`,
          nameBn: `${modCode} থেরাপি`,
          defaultDurationMin: dto.durationMinutes || 15,
          defaultPricePaisa: 30000,
          isActive: 1,
        });
      } catch {
        try {
          (this.db as any).session?.client
            ?.prepare('INSERT OR IGNORE INTO modalities (id, code, name_en, name_bn, default_duration_min, default_price_paisa, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
            ?.run(`mod-${modCode.toLowerCase()}`, modCode, `${modCode} Therapy`, `${modCode} থেরাপি`, dto.durationMinutes || 15, 30000);
        } catch {}
      }
    }

    // 2. Validate therapist staff ID against staff table (SQLite enforces REFERENCES staff(id))
    let effectiveTherapistId: string | null = null;
    const targetStaffId = dto.therapistStaffId || therapistStaffId;
    if (targetStaffId) {
      try {
        const staffRows = await this.db.select({ id: staff.id }).from(staff).where(eq(staff.id, targetStaffId));
        if (staffRows[0]) {
          effectiveTherapistId = staffRows[0].id;
        } else {
          // If targetStaffId is not in staff, check if it's a user and mirror into staff
          const userRows = await this.db.select().from(users).where(eq(users.id, targetStaffId));
          if (userRows[0]) {
            try {
              (this.db as any).session?.client
                ?.prepare('INSERT OR IGNORE INTO staff (id, user_id, full_name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)')
                ?.run(userRows[0].id, userRows[0].id, userRows[0].displayName || userRows[0].email, userRows[0].role, now, now);
              effectiveTherapistId = userRows[0].id;
            } catch {
              effectiveTherapistId = null;
            }
          }
        }
      } catch {
        effectiveTherapistId = null;
      }
    }

    // If still not verified in staff table, leave null so SQLite FK constraint never fails
    if (effectiveTherapistId) {
      try {
        const verifyInStaff = await this.db.select({ id: staff.id }).from(staff).where(eq(staff.id, effectiveTherapistId));
        if (!verifyInStaff[0]) effectiveTherapistId = null;
      } catch {
        effectiveTherapistId = null;
      }
    }

    // 3. Validate planId if passed
    let validPlanId: string | null = null;
    if (dto.planId) {
      try {
        const planRows = await this.db.select({ id: therapyPlans.id }).from(therapyPlans).where(eq(therapyPlans.id, dto.planId));
        if (planRows[0]) validPlanId = planRows[0].id;
      } catch {
        validPlanId = null;
      }
    }

    const sessionId = randomUUID();
    const row = {
      id: sessionId,
      planId: validPlanId,
      patientId: dto.patientId,
      therapistStaffId: effectiveTherapistId,
      bedId: null,
      modalityCode: modCode,
      status: 'in_progress' as const,
      startedAt: now,
      endedAt: null,
      durationMinutes: dto.durationMinutes ?? 0,
      outcomeNote: dto.notes ?? null,
      painScoreAfter: null,
      isOvertime: 0,
      createdAt: now,
      updatedAt: now,
    };

    // 4. Robust insert with multi-level FK error recovery
    try {
      await this.db.insert(therapySessions).values(row);
    } catch (insertErr) {
      console.warn('Primary therapy_sessions insert failed, attempting safe fallback with null foreign keys:', insertErr);
      try {
        const fallbackRow = {
          ...row,
          therapistStaffId: null,
          bedId: null,
          planId: null,
        };
        await this.db.insert(therapySessions).values(fallbackRow);
      } catch (fallbackErr) {
        console.warn('Fallback insert failed, attempting direct SQLite raw query:', fallbackErr);
        try {
          (this.db as any).session?.client
            ?.prepare(
              'INSERT INTO therapy_sessions (id, plan_id, patient_id, therapist_staff_id, bed_id, modality_code, status, started_at, duration_minutes, outcome_note, is_overtime, created_at, updated_at) VALUES (?, NULL, ?, NULL, NULL, ?, ?, ?, ?, ?, 0, ?, ?)'
            )
            ?.run(sessionId, dto.patientId, modCode, 'in_progress', now, dto.durationMinutes ?? 15, dto.notes ?? null, now, now);
        } catch (rawErr) {
          console.error('CRITICAL: All therapy_sessions insert attempts failed:', rawErr);
          throw rawErr;
        }
      }
    }

    // Update patient's active visit for today: status = 'in_therapy', currentLocation = 'therapy_hall'
    if (dto.visitId) {
      try {
        await this.db
          .update(visits)
          .set({
            status: 'in_therapy' as any,
            currentLocation: 'therapy_hall',
            roomId: dto.roomId ?? undefined,
            updatedAt: now,
          })
          .where(eq(visits.id, dto.visitId));
      } catch {
        try {
          (this.db as any).session?.client
            ?.prepare("UPDATE visits SET status = 'in_therapy', current_location = 'therapy_hall', updated_at = ? WHERE id = ?")
            ?.run(now, dto.visitId);
        } catch {}
      }
    } else {
      try {
        await this.db
          .update(visits)
          .set({
            status: 'in_therapy' as any,
            currentLocation: 'therapy_hall',
            roomId: dto.roomId ?? undefined,
            updatedAt: now,
          })
          .where(and(eq(visits.patientId, dto.patientId), eq(visits.visitDate, today)));
      } catch {}
    }

    const payload = {
      sessionId,
      patientId: dto.patientId,
      visitId: dto.visitId,
      patientName: patientRows[0].nameEn,
      modalityCode: modCode,
      roomId: dto.roomId,
      status: 'in_therapy',
      bedId: null,
      therapistStaffId: effectiveTherapistId,
      startedAt: now,
    };

    try {
      this.gateway?.emit('clinic:global', 'session.started', payload);
      this.gateway?.emit('clinic:global', 'therapy.in_session', payload);
    } catch {}
    try {
      this.realtime?.publish('session.started', payload);
      this.realtime?.publish('therapy.in_session', payload);
    } catch {}

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy.session_start',
      entity: 'therapy_sessions',
      entityId: sessionId,
      after: payload,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }

  async completeSession(
    actor: { sub?: string; role?: string },
    sessionId: string,
    dto: CompleteSessionDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const sessionRows = await this.db
      .select()
      .from(therapySessions)
      .where(eq(therapySessions.id, sessionId));
    const session = sessionRows[0];
    if (!session) throw new NotFoundException('Therapy session not found');

    const modRows = await this.db
      .select()
      .from(modalities)
      .where(eq(modalities.code, session.modalityCode));
    const expectedMinutes = modRows[0]?.defaultDurationMin ?? 20;
    const isOvertime = dto.durationMinutes > expectedMinutes ? 1 : 0;

    const now = new Date().toISOString();
    await this.db
      .update(therapySessions)
      .set({
        status: 'completed',
        endedAt: now,
        durationMinutes: dto.durationMinutes,
        outcomeNote: dto.outcomeNote ?? null,
        painScoreAfter: dto.painScoreAfter ?? null,
        isOvertime,
        updatedAt: now,
      })
      .where(eq(therapySessions.id, sessionId));

    // Update therapy plan if applicable
    if (session.planId) {
      const planRows = await this.db
        .select()
        .from(therapyPlans)
        .where(eq(therapyPlans.id, session.planId));
      if (planRows[0]) {
        const completed = planRows[0].completedSessions + 1;
        const isPlanDone = completed >= planRows[0].totalSessionsPrescribed;
        await this.db
          .update(therapyPlans)
          .set({
            completedSessions: completed,
            status: isPlanDone ? 'completed' : 'active',
            updatedAt: now,
          })
          .where(eq(therapyPlans.id, session.planId));
      }
    }

    // Decrement package credit if patient holds active package
    const creditRows = await this.db
      .select({
        credit: packageCredits,
        pkg: packages,
      })
      .from(packageCredits)
      .innerJoin(packages, eq(packageCredits.packageId, packages.id))
      .where(and(eq(packageCredits.patientId, session.patientId), eq(packageCredits.status, 'active')))
      .orderBy(desc(packageCredits.createdAt))
      .limit(1);

    if (creditRows[0]) {
      const { credit, pkg } = creditRows[0];
      const pkgType = pkg.packageType || 'per_session';
      const todayDhaka = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

      if (pkgType === 'per_session') {
        const rem = credit.remainingSessions - 1;
        const isExhausted = rem <= 0;
        await this.db
          .update(packageCredits)
          .set({
            remainingSessions: Math.max(0, rem),
            status: isExhausted ? 'exhausted' : 'active',
            updatedAt: now,
          })
          .where(eq(packageCredits.id, credit.id));
      } else if (pkgType === 'per_day') {
        let visitedDates: string[] = [];
        try {
          visitedDates = JSON.parse(credit.visitedDatesJson || '[]');
          if (!Array.isArray(visitedDates)) visitedDates = [];
        } catch {
          visitedDates = [];
        }

        if (!visitedDates.includes(todayDhaka)) {
          visitedDates.push(todayDhaka);
          const remDays = credit.remainingDays - 1;
          const isExhausted = remDays <= 0;
          await this.db
            .update(packageCredits)
            .set({
              remainingDays: Math.max(0, remDays),
              visitedDatesJson: JSON.stringify(visitedDates),
              status: isExhausted ? 'exhausted' : 'active',
              updatedAt: now,
            })
            .where(eq(packageCredits.id, credit.id));
        }
      }
    }

    const payload = {
      sessionId,
      patientId: session.patientId,
      modalityCode: session.modalityCode,
      durationMinutes: dto.durationMinutes,
      isOvertime,
      completedAt: now,
    };

    this.gateway.emit('clinic:global', 'session.completed', payload);
    this.realtime.publish('session.completed', payload);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy.session_complete',
      entity: 'therapy_sessions',
      entityId: sessionId,
      after: payload,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, ...payload };
  }

  async getTodaySessions(therapistStaffId?: string) {
    const today = new Date().toISOString().slice(0, 10);
    const conditions = [];
    if (therapistStaffId) {
      conditions.push(eq(therapySessions.therapistStaffId, therapistStaffId));
    }

    const rows = await this.db
      .select({
        session: therapySessions,
        patient: patients,
        therapist: users,
      })
      .from(therapySessions)
      .innerJoin(patients, eq(therapySessions.patientId, patients.id))
      .leftJoin(users, eq(therapySessions.therapistStaffId, users.id))
      .orderBy(desc(therapySessions.createdAt));

    return rows.map((r) => ({
      ...r.session,
      patientName: r.patient.nameEn,
      patientMrn: r.patient.mrn,
      bedCode: null,
      machineCode: null,
      therapistName: r.therapist?.displayName ?? 'Therapist',
    }));
  }

  async getOccupancy() {
    const allRooms = await this.db.select().from(rooms);

    const activeSessions = await this.db
      .select({
        session: therapySessions,
        patient: patients,
      })
      .from(therapySessions)
      .innerJoin(patients, eq(therapySessions.patientId, patients.id))
      .where(eq(therapySessions.status, 'in_progress'));

    return {
      rooms: allRooms,
      beds: [],
      machines: [],
      totalActiveSessions: activeSessions.length,
    };
  }

  // --- Packages CRUD and Credits Ledger ---------------------------------------

  async listPackages() {
    return this.db.select().from(packages);
  }

  async createPackage(
    actor: { sub?: string; role?: string },
    dto: CreatePackageDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const packageType = dto.packageType || 'per_session';
    const pricePaisa =
      dto.pricePaisa !== undefined
        ? dto.pricePaisa
        : (dto.priceBdt !== undefined ? dto.priceBdt * 100 : 0);
    const totalConsultations = dto.totalConsultations ?? 9999;
    const totalTherapySessions =
      dto.totalTherapySessions !== undefined
        ? dto.totalTherapySessions
        : (packageType === 'per_session' ? 10 : 9999);
    const totalDays =
      dto.totalDays !== undefined
        ? dto.totalDays
        : (packageType === 'per_day' ? 10 : 0);

    const row = {
      id: randomUUID(),
      nameEn: dto.nameEn.trim(),
      nameBn: dto.nameBn?.trim() || dto.nameEn.trim(),
      packageType,
      totalConsultations,
      totalTherapySessions,
      totalDays,
      validityDays: dto.validityDays,
      pricePaisa,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(packages).values(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'packages.create',
      entity: 'packages',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return row;
  }

  async purchasePackage(
    actor: { sub?: string; role?: string },
    dto: PurchasePackageDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const pkgRows = await this.db
      .select()
      .from(packages)
      .where(eq(packages.id, dto.packageId));
    const pkg = pkgRows[0];
    if (!pkg) throw new NotFoundException('Package not found');

    const packageType = pkg.packageType || 'per_session';
    const validityDays = dto.customValidityDays ?? pkg.validityDays ?? 30;

    let remainingDays = 0;
    let remainingSessions = 0;
    const remainingConsultations = 9999;

    if (packageType === 'per_day') {
      const days = dto.customDays ?? (pkg.totalDays > 0 ? pkg.totalDays : 10);
      remainingDays = days;
      remainingSessions = 9999;
    } else {
      // per_session
      const sessions = dto.customSessions ?? (pkg.totalTherapySessions > 0 ? pkg.totalTherapySessions : 10);
      remainingSessions = sessions;
      remainingDays = 9999;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();
    const creditId = randomUUID();

    const row = {
      id: creditId,
      patientId: dto.patientId,
      packageId: dto.packageId,
      billId: dto.billId ?? null,
      remainingConsultations,
      remainingSessions,
      remainingDays,
      visitedDatesJson: '[]',
      purchasedAt: now.toISOString(),
      expiresAt,
      status: 'active' as const,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await this.db.insert(packageCredits).values(row);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'packages.purchase',
      entity: 'package_credits',
      entityId: creditId,
      after: {
        ...row,
        customPriceBdt: dto.customPriceBdt,
        customPricePaisa: dto.customPricePaisa,
      },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ...row, package: pkg };
  }

  async getPatientCredits(patientId: string) {
    const rows = await this.db
      .select({
        credit: packageCredits,
        package: packages,
      })
      .from(packageCredits)
      .innerJoin(packages, eq(packageCredits.packageId, packages.id))
      .where(eq(packageCredits.patientId, patientId))
      .orderBy(desc(packageCredits.createdAt));

    return rows.map((r) => ({
      ...r.credit,
      package: r.package,
      packageNameEn: r.package.nameEn,
      packageNameBn: r.package.nameBn,
      packageType: r.package.packageType,
    }));
  }

  async getRooms() {
    // Strictly filter to ONLY therapy rooms and therapy halls
    const rawRooms = await this.db
      .select()
      .from(rooms)
      .where(and(eq(rooms.isActive, 1), isNull(rooms.deletedAt)))
      .orderBy(rooms.roomNumber);

    const therapyRooms = rawRooms.filter((r) => {
      const type = (r.type || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      const id = (r.id || '').toLowerCase();

      // Strictly exclude non-therapy rooms (doctor consultation chambers, waiting lounge, cashier, staff rooms)
      if (
        type === 'doctor_consultation_room' ||
        type === 'waiting_room' ||
        type === 'cashier_room' ||
        type === 'staff_room' ||
        type.includes('doctor') ||
        type.includes('consultation') ||
        type.includes('cashier') ||
        name.includes('consultation') ||
        name.includes('chamber') ||
        name.includes('চেম্বার') ||
        name.includes('cashier') ||
        name.includes('waiting') ||
        name.includes('reception')
      ) {
        return false;
      }

      // Allow therapy_room, therapy_hall, or dedicated therapy units
      return (
        type === 'therapy_room' ||
        type === 'therapy_hall' ||
        id === 'room-th-01' ||
        id === 'room-th-02' ||
        id === 'room-tr-01' ||
        name.includes('therapy') ||
        name.includes('hall') ||
        name.includes('rehab') ||
        name.includes('থেরাপি')
      );
    });

    // If no therapy rooms found in database, provide fallback default therapy halls
    const finalRooms = therapyRooms.length > 0 ? therapyRooms : [
      {
        id: 'room-th-01',
        roomNumber: 'TH-01',
        code: 'TH-01',
        name: 'Male Physiotherapy & Rehab Hall',
        type: 'therapy_hall',
      },
      {
        id: 'room-th-02',
        roomNumber: 'TH-02',
        code: 'TH-02',
        name: 'Female Physiotherapy & Rehab Hall',
        type: 'therapy_hall',
      },
      {
        id: 'room-tr-01',
        roomNumber: 'TR-01',
        code: 'TR-01',
        name: 'Private Therapy Suite 1',
        type: 'therapy_room',
      },
    ];

    const today = new Date().toISOString().slice(0, 10);
    const occupiedVisits = await this.db
      .select({
        roomId: visits.roomId,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(
        and(
          eq(visits.visitDate, today),
          sql`${visits.status} IN ('calling', 'in_therapy')`,
        ),
      );

    const occupiedMap = new Map<string, string>();
    for (const ov of occupiedVisits) {
      const pName = ov.patientNameBn || ov.patientNameEn;
      if (ov.roomId) occupiedMap.set(ov.roomId, pName);
    }

    return finalRooms.map((r: any, idx: number) => {
      const roomNum = r.roomNumber || r.code || `${idx + 1}`;
      const hasNumber = /\d/.test(r.name || '');
      const baseName = r.name || 'Therapy Room';
      const formattedName = hasNumber ? baseName : `${baseName} ${roomNum}`;
      const isOcc = occupiedMap.has(r.id);
      return {
        id: r.id,
        name: formattedName,
        displayName: `রুম ${roomNum} (${formattedName})`,
        code: String(roomNum),
        roomNumber: String(roomNum),
        type: r.type === 'private_room' ? 'therapy_room' : r.type,
        isOccupied: isOcc,
        currentPatientName: occupiedMap.get(r.id) || null,
      };
    });
  }

  async getQueue() {
    const today = new Date().toISOString().slice(0, 10);

    // 1. All active therapy slot bookings for today
    const todayBookings = await this.db
      .select({
        booking: therapySlotBookings,
        patient: patients,
      })
      .from(therapySlotBookings)
      .innerJoin(patients, eq(therapySlotBookings.patientId, patients.id))
      .where(
        and(
          eq(therapySlotBookings.bookingDate, today),
          sql`${therapySlotBookings.status} NOT IN ('cancelled')`,
          isNull(therapySlotBookings.deletedAt),
        ),
      );

    const bookingMapByPatientId = new Map<string, typeof todayBookings[0]>();
    for (const b of todayBookings) {
      bookingMapByPatientId.set(b.patient.id, b);
    }

    // 2. Visits for therapy today
    const therapyVisits = await this.db
      .select({
        visit: visits,
        patient: patients,
        booking: therapySlotBookings,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(therapySlotBookings, eq(visits.therapyBookingId, therapySlotBookings.id))
      .where(eq(visits.visitDate, today))
      .orderBy(desc(visits.createdAt));

    // Filter relevant visits: therapy_hall location, therapy status, or patient with booked therapy slot today
    const relevantVisits = therapyVisits.filter(
      ({ visit: v, patient: p }) =>
        v.currentLocation === 'therapy_hall' ||
        v.currentLocation === 'Therapy Hall' ||
        v.status === 'in_therapy' ||
        (v as any).status === 'calling' ||
        v.therapyBookingId !== null ||
        bookingMapByPatientId.has(p.id),
    );

    // Auto-link visits to slot booking if visits.therapyBookingId was null
    for (const item of relevantVisits) {
      if (!item.visit.therapyBookingId && bookingMapByPatientId.has(item.patient.id)) {
        const matchingBooking = bookingMapByPatientId.get(item.patient.id)!;
        item.booking = matchingBooking.booking;
        this.db
          .update(visits)
          .set({
            therapyBookingId: matchingBooking.booking.id,
            currentLocation: 'therapy_hall',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(visits.id, item.visit.id))
          .catch(() => {});
      }
    }

    // 2. Active Sessions
    const activeSessions = await this.db
      .select({
        session: therapySessions,
        patient: patients,
        modality: modalities,
      })
      .from(therapySessions)
      .innerJoin(patients, eq(therapySessions.patientId, patients.id))
      .leftJoin(modalities, eq(therapySessions.modalityCode, modalities.code))
      .where(eq(therapySessions.status, 'in_progress'));

    const activePatientIds = new Set(activeSessions.map((s) => s.patient.id));

    const nowServing: any[] = [];
    const waiting: any[] = [];
    const inTherapyPatients: any[] = [];

    for (const { visit: v, patient: p, booking: b } of relevantVisits) {
      const isCalling = (v as any).status === 'calling';
      const item = {
        id: v.id,
        visitId: v.id,
        patientId: p.id,
        tokenNumber: v.tokenNumber,
        patientNameEn: p.nameEn,
        patientNameBn: p.nameBn || p.nameEn,
        mrn: p.mrn,
        phone: p.phone,
        gender: p.gender,
        ageYears: p.ageYears,
        priority: v.priority || 'normal',
        status: isCalling
          ? 'calling'
          : v.status === 'in_therapy' || activePatientIds.has(p.id)
          ? 'in_therapy'
          : 'waiting',
        assignedRoomId: (v as any).calledRoomId || v.roomId || null,
        assignedRoomName: (v as any).calledRoomName || null,
        modalityCode: 'PHYSIO',
        modalityName: 'Physiotherapy & Rehab',
        modalityNameBn: 'ফিজিওথেরাপি ও পুনর্বাসন',
        toldTime: v.toldTime || b?.toldTime || null,
        checkedInAt: v.checkedInAt || v.createdAt,
        punctualityStatus: v.punctualityStatus || b?.punctualityStatus || null,
        delayMinutes: v.delayMinutes || b?.delayMinutes || null,
        calledAt: (v as any).calledAt || null,
      };

      const matchingSession = activeSessions.find((as) => as.patient.id === p.id);
      if (matchingSession) {
        item.modalityCode = matchingSession.session.modalityCode;
        item.modalityName = matchingSession.modality?.nameEn || matchingSession.session.modalityCode;
        item.modalityNameBn = matchingSession.modality?.nameBn || matchingSession.session.modalityCode;
        (item as any).sessionId = matchingSession.session.id;
        (item as any).durationMinutes = matchingSession.session.durationMinutes;
        (item as any).startedAt = matchingSession.session.startedAt;
      }

      if (isCalling) {
        nowServing.push(item);
      } else if (v.status !== 'checked_out' && v.status !== 'cancelled') {
        if (activePatientIds.has(p.id) || v.status === 'in_therapy') {
          inTherapyPatients.push(item);
        } else {
          waiting.push(item);
        }
      }
    }

    return {
      waiting,
      nowServing,
      inSession: inTherapyPatients,
      inTherapy: inTherapyPatients,
      activeSessions: [
        ...activeSessions.map(({ session: s, patient: p, modality: m }) => {
          const matchingV = relevantVisits.find((rv) => rv.patient.id === p.id);
          return {
            sessionId: s.id,
            visitId: matchingV?.visit.id || null,
            patientId: p.id,
            patientNameEn: p.nameEn,
            patientNameBn: p.nameBn,
            mrn: p.mrn,
            bedName: matchingV?.visit.roomId || null,
            modalityCode: s.modalityCode,
            modalityNameEn: m?.nameEn || s.modalityCode,
            modalityNameBn: m?.nameBn || s.modalityCode,
            startedAt: s.startedAt,
            durationMinutes: s.durationMinutes || 20,
          };
        }),
        ...inTherapyPatients
          .filter((it) => !activeSessions.some((as) => as.patient.id === it.patientId))
          .map((it) => ({
            sessionId: it.visitId,
            visitId: it.visitId,
            patientId: it.patientId,
            patientNameEn: it.patientNameEn,
            patientNameBn: it.patientNameBn,
            mrn: it.mrn,
            bedName: it.assignedRoomName,
            modalityCode: it.modalityCode,
            modalityNameEn: it.modalityName,
            modalityNameBn: it.modalityNameBn,
            startedAt: it.calledAt || it.checkedInAt,
            durationMinutes: 20,
          })),
      ],
    };
  }

  async callPatient(
    actor: { sub?: string; role?: string },
    dto: CallTherapyPatientDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    let visitRow: any = null;
    if (dto.visitId) {
      const rows = await this.db.select().from(visits).where(eq(visits.id, dto.visitId));
      visitRow = rows[0];
    } else if (dto.patientId) {
      const rows = await this.db
        .select()
        .from(visits)
        .where(and(eq(visits.patientId, dto.patientId), eq(visits.visitDate, today)))
        .orderBy(desc(visits.createdAt));
      visitRow = rows[0];
    }

    if (!visitRow) {
      throw new NotFoundException('Active visit not found for patient');
    }

    const patientRows = await this.db.select().from(patients).where(eq(patients.id, visitRow.patientId));
    const patient = patientRows[0];

    const allRooms = await this.db.select().from(rooms);
    const targetRoomId = dto.roomId || visitRow.roomId || allRooms[0]?.id || 'therapy-hall-1';
    const foundRoom = allRooms.find((r) => r.id === targetRoomId);
    const roomNum = dto.roomNumber || (foundRoom?.roomNumber ? Number(foundRoom.roomNumber) : 1);
    let targetRoomName = dto.roomName || foundRoom?.name || `Therapy Room ${roomNum}`;
    if (!/\d/.test(targetRoomName)) {
      targetRoomName = `${targetRoomName} ${roomNum}`;
    }

    // Update visit status to calling
    await this.db
      .update(visits)
      .set({
        status: 'calling' as any,
        currentLocation: 'therapy_hall',
        roomId: targetRoomId,
        updatedAt: now,
      })
      .where(eq(visits.id, visitRow.id));

    // Try updating called_room_id and called_room_name if columns exist
    try {
      (this.db as any).session?.client
        ?.prepare(
          'UPDATE visits SET status = ?, called_room_id = ?, called_room_name = ?, called_at = ?, updated_at = ? WHERE id = ?',
        )
        ?.run('calling', targetRoomId, targetRoomName, now, now, visitRow.id);
    } catch {}

    const tok = (visitRow.tokenNumber && Number(visitRow.tokenNumber) > 0) ? Number(visitRow.tokenNumber) : 1;
    const payload = {
      visitId: visitRow.id,
      patientId: patient?.id,
      tokenNumber: tok,
      serialNumber: tok,
      patientNameEn: patient?.nameEn || 'Patient',
      patientNameBn: patient?.nameBn || patient?.nameEn,
      roomId: targetRoomId,
      roomName: targetRoomName,
      roomNumber: roomNum,
      modality: dto.modalityCode || 'Physiotherapy & Rehab',
      type: 'therapy',
      isTherapy: true,
      calledAt: now,
    };

    // Broadcast Realtime Events
    this.gateway?.emit('clinic:global', 'therapy.called', payload);
    this.realtime?.publish('therapy.called', payload);

    // Log Timeline Event
    try {
      const id = randomUUID();
      await this.db.insert(patientTimelineEvents).values({
        id,
        patientId: visitRow.patientId,
        visitId: visitRow.id,
        step: 'therapy_called',
        titleEn: `Called to Therapy: ${dto.roomName || 'Therapy Room'}`,
        titleBn: `থেরাপি আহ্বান: ${dto.roomName || 'থেরাপি রুম'}`,
        descriptionEn: `Patient called to ${dto.roomName || 'Therapy Room'} for session by ${actor.role || 'Staff'}`,
        descriptionBn: `${actor.role || 'স্টাফ'} কর্তৃক রোগীকে ${dto.roomName || 'থেরাপি রুমে'} ডাকা হয়েছে।`,
        actorId: actor.sub || null,
        actorRole: actor.role || 'handler',
        occurredAt: now,
        date: today,
      });
    } catch {}

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy.call_patient',
      entity: 'visits',
      entityId: visitRow.id,
      after: payload,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return payload;
  }

  async markInTherapy(
    actor: { sub?: string; role?: string },
    dto: MarkInTherapyDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    let visitRow: any = null;
    if (dto.visitId) {
      const rows = await this.db.select().from(visits).where(eq(visits.id, dto.visitId));
      visitRow = rows[0];
    } else if (dto.patientId) {
      const rows = await this.db
        .select()
        .from(visits)
        .where(and(eq(visits.patientId, dto.patientId), eq(visits.visitDate, today)))
        .orderBy(desc(visits.createdAt));
      visitRow = rows[0];
    }

    if (!visitRow) {
      throw new NotFoundException('Active visit not found');
    }

    // Update visit status to in_therapy
    await this.db
      .update(visits)
      .set({
        status: 'in_therapy',
        currentLocation: 'therapy_hall',
        roomId: dto.roomId || visitRow.roomId,
        updatedAt: now,
      })
      .where(eq(visits.id, visitRow.id));

    // Try updating called_room_id and called_room_name if columns exist
    try {
      (this.db as any).session?.client
        ?.prepare('UPDATE visits SET status = ?, updated_at = ? WHERE id = ?')
        ?.run('in_therapy', now, visitRow.id);
    } catch {}

    const payload = {
      visitId: visitRow.id,
      patientId: visitRow.patientId,
      tokenNumber: visitRow.tokenNumber,
      roomId: dto.roomId,
      roomName: dto.roomName,
      status: 'in_therapy',
    };

    // Broadcast Realtime Events
    this.gateway?.emit('clinic:global', 'therapy.in_session', payload);
    this.realtime?.publish('therapy.in_session', payload);

    // Log Timeline Event
    try {
      const id = randomUUID();
      await this.db.insert(patientTimelineEvents).values({
        id,
        patientId: visitRow.patientId,
        visitId: visitRow.id,
        step: 'in_therapy',
        titleEn: 'Therapy Session Started',
        titleBn: 'থেরাপি সেশন শুরু',
        descriptionEn: `Patient entered therapy room ${dto.roomName || ''} and session commenced.`,
        descriptionBn: `রোগী থেরাপি রুমে (${dto.roomName || ''}) প্রবেশ করেছেন এবং সেশন শুরু হয়েছে।`,
        actorId: actor.sub || null,
        actorRole: actor.role || 'handler',
        occurredAt: now,
        date: today,
      });
    } catch {}

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy.mark_in_therapy',
      entity: 'visits',
      entityId: visitRow.id,
      after: payload,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return payload;
  }

  async recallPatient(
    actor: { sub?: string; role?: string },
    dto: RecallTherapyPatientDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    let visitRow: any = null;
    if (dto.visitId) {
      const rows = await this.db.select().from(visits).where(eq(visits.id, dto.visitId));
      visitRow = rows[0];
    } else if (dto.patientId) {
      const rows = await this.db
        .select()
        .from(visits)
        .where(and(eq(visits.patientId, dto.patientId), eq(visits.visitDate, today)))
        .orderBy(desc(visits.createdAt));
      visitRow = rows[0];
    }

    if (!visitRow) {
      throw new NotFoundException('Active visit not found');
    }

    const patientRows = await this.db.select().from(patients).where(eq(patients.id, visitRow.patientId));
    const patient = patientRows[0];

    const allRooms = await this.db.select().from(rooms);
    const targetRoomId = dto.roomId || visitRow.roomId || allRooms[0]?.id || 'therapy-hall-1';
    const foundRoom = allRooms.find((r) => r.id === targetRoomId);
    const roomNum = dto.roomNumber || (foundRoom?.roomNumber ? Number(foundRoom.roomNumber) : 1);
    let targetRoomName = dto.roomName || foundRoom?.name || `Therapy Room ${roomNum}`;
    if (!/\d/.test(targetRoomName)) {
      targetRoomName = `${targetRoomName} ${roomNum}`;
    }

    const tok = (visitRow.tokenNumber && Number(visitRow.tokenNumber) > 0) ? Number(visitRow.tokenNumber) : 1;
    const payload = {
      visitId: visitRow.id,
      patientId: patient?.id,
      tokenNumber: tok,
      serialNumber: tok,
      patientNameEn: patient?.nameEn || 'Patient',
      patientNameBn: patient?.nameBn || patient?.nameEn,
      roomId: targetRoomId,
      roomName: targetRoomName,
      roomNumber: roomNum,
      type: 'therapy',
      isTherapy: true,
      calledAt: now,
    };

    // Re-broadcast calling event
    this.gateway?.emit('clinic:global', 'therapy.called', payload);
    this.realtime?.publish('therapy.called', payload);

    // Log Timeline Event
    try {
      const id = randomUUID();
      await this.db.insert(patientTimelineEvents).values({
        id,
        patientId: visitRow.patientId,
        visitId: visitRow.id,
        step: 'therapy_recalled',
        titleEn: 'Therapy Call Re-announced',
        titleBn: 'থেরাপি আহ্বান পুনরাবৃত্তি',
        descriptionEn: `Patient re-called on waiting display by ${actor.role || 'Staff'}`,
        descriptionBn: `টিভি ও স্পিকারে রোগীকে পুনরায় ডাকা হয়েছে।`,
        actorId: actor.sub || null,
        actorRole: actor.role || 'handler',
        occurredAt: now,
        date: today,
      });
    } catch {}

    return payload;
  }

  async cancelCall(
    actor: { sub?: string; role?: string },
    dto: CancelTherapyCallDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    let visitRow: any = null;
    if (dto.visitId) {
      const rows = await this.db.select().from(visits).where(eq(visits.id, dto.visitId));
      visitRow = rows[0];
    } else if (dto.patientId) {
      const rows = await this.db
        .select()
        .from(visits)
        .where(and(eq(visits.patientId, dto.patientId), eq(visits.visitDate, today)))
        .orderBy(desc(visits.createdAt));
      visitRow = rows[0];
    }

    if (!visitRow) {
      throw new NotFoundException('Active visit not found');
    }

    // Revert visit status to checked_in
    await this.db
      .update(visits)
      .set({
        status: 'checked_in',
        updatedAt: now,
      })
      .where(eq(visits.id, visitRow.id));

    // Try clearing called_room_id if column exists
    try {
      (this.db as any).session?.client
        ?.prepare('UPDATE visits SET status = ?, called_room_id = NULL, called_room_name = NULL, updated_at = ? WHERE id = ?')
        ?.run('checked_in', now, visitRow.id);
    } catch {}

    const payload = {
      visitId: visitRow.id,
      patientId: visitRow.patientId,
      tokenNumber: visitRow.tokenNumber,
      status: 'checked_in',
    };

    // Broadcast Realtime Events
    this.gateway?.emit('clinic:global', 'therapy.call_cancelled', payload);
    this.realtime?.publish('therapy.call_cancelled', payload);

    // Log Timeline Event
    try {
      const id = randomUUID();
      await this.db.insert(patientTimelineEvents).values({
        id,
        patientId: visitRow.patientId,
        visitId: visitRow.id,
        step: 'therapy_call_cancelled',
        titleEn: 'Therapy Call Cancelled',
        titleBn: 'থেরাপি আহ্বান বাতিল',
        descriptionEn: `Therapy call cancelled. Patient remains in waiting queue.`,
        descriptionBn: `থেরাপি আহ্বান বাতিল করা হয়েছে এবং রোগী কিউতে অপেক্ষমাণ আছেন।`,
        actorId: actor.sub || null,
        actorRole: actor.role || 'handler',
        occurredAt: now,
        date: today,
      });
    } catch {}

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy.cancel_call',
      entity: 'visits',
      entityId: visitRow.id,
      after: payload,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return payload;
  }

  async sendToCashier(
    actor: { sub?: string; role?: string },
    dto: SendToCashierDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const visitRows = await this.db
      .select()
      .from(visits)
      .where(eq(visits.id, dto.visitId));
    const visit = visitRows[0];
    if (!visit) throw new NotFoundException('Visit not found');

    const patientRows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId || visit.patientId));
    const patient = patientRows[0];
    if (!patient) throw new NotFoundException('Patient not found');

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const feePaisa = Math.round(dto.feeTaka * 100);
    const modalityCode = dto.modalityCode || 'PHYSIO';

    const notesJson = JSON.stringify({
      isLockedByHandler: true,
      fixedFeeTaka: dto.feeTaka,
      modalityCode,
      handlerNotes: dto.notes,
    });

    const existingDraftBill = await this.db
      .select()
      .from(bills)
      .where(and(eq(bills.visitId, visit.id), eq(bills.status, 'draft')))
      .limit(1);

    let billId: string;
    let billNumber: string;

    if (existingDraftBill.length > 0) {
      billId = existingDraftBill[0].id;
      billNumber = existingDraftBill[0].billNumber;
      await this.db
        .update(bills)
        .set({
          subtotalPaisa: feePaisa,
          discountPaisa: 0,
          totalPaisa: feePaisa,
          paidPaisa: 0,
          duePaisa: feePaisa,
          status: 'draft',
          notes: notesJson,
          updatedAt: now,
        })
        .where(eq(bills.id, billId));

      await this.db.delete(billItems).where(eq(billItems.billId, billId));
    } else {
      billId = randomUUID();
      billNumber = 'BILL-TH-' + Date.now().toString().slice(-6);
      await this.db.insert(bills).values({
        id: billId,
        billNumber,
        visitId: visit.id,
        patientId: visit.patientId,
        subtotalPaisa: feePaisa,
        discountPaisa: 0,
        totalPaisa: feePaisa,
        paidPaisa: 0,
        duePaisa: feePaisa,
        status: 'draft',
        notes: notesJson,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.db.insert(billItems).values({
      id: randomUUID(),
      billId,
      itemType: 'therapy',
      description: `Therapy Session (${modalityCode}) - Fixed Fee`,
      unitPricePaisa: feePaisa,
      quantity: 1,
      discountPaisa: 0,
      totalPaisa: feePaisa,
    });

    await this.db
      .update(visits)
      .set({
        currentLocation: 'cashier',
        status: 'billed',
        updatedAt: now,
      })
      .where(eq(visits.id, visit.id));

    try {
      await this.db.insert(patientTimelineEvents).values({
        id: randomUUID(),
        patientId: visit.patientId,
        visitId: visit.id,
        step: 'sent_to_cashier',
        titleEn: 'Forwarded to Cashier for Therapy Fee',
        titleBn: 'থেরাপি বিলের জন্য ক্যাশিয়ারে প্রেরণ',
        descriptionEn: `Forwarded to cashier with fixed bill ৳${dto.feeTaka}`,
        descriptionBn: `হ্যান্ডলার কর্তৃক ফিক্সড বিল ৳${dto.feeTaka} সহ ক্যাশিয়ারে পাঠানো হয়েছে।`,
        actorId: actor.sub || null,
        actorRole: actor.role || 'handler',
        metadataJson: JSON.stringify({
          billId,
          feeTaka: dto.feeTaka,
          modalityCode,
          notes: dto.notes,
        }),
        occurredAt: now,
        date: today,
      });
    } catch (e) {
      console.warn('Timeline log error:', e);
    }

    const therapyPayload = {
      visitId: visit.id,
      patientId: visit.patientId,
      billId,
      billNumber,
      feeTaka: dto.feeTaka,
      feePaisa,
      modalityCode,
      currentLocation: 'cashier',
      status: 'billed',
    };

    const routePayload = {
      visitId: visit.id,
      patientId: visit.patientId,
      previousLocation: visit.currentLocation,
      currentLocation: 'cashier',
      status: 'billed',
      targetId: null,
    };

    const billPayload = {
      billId,
      billNumber,
      patientId: visit.patientId,
      visitId: visit.id,
      totalPaisa: feePaisa,
    };

    this.gateway?.emit('clinic:global', 'therapy.sent_to_cashier', therapyPayload);
    this.realtime?.publish('therapy.sent_to_cashier', therapyPayload);

    this.gateway?.emit('clinic:global', 'visit.routed', routePayload);
    this.realtime?.publish('visit.routed', routePayload);

    this.gateway?.emit('clinic:global', 'bill.created', billPayload);
    this.realtime?.publish('bill.created', billPayload);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy.send_to_cashier',
      entity: 'bills',
      entityId: billId,
      after: {
        billId,
        billNumber,
        visitId: visit.id,
        patientId: visit.patientId,
        feeTaka: dto.feeTaka,
        feePaisa,
        modalityCode,
        notes: notesJson,
      },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      success: true,
      billId,
      feeTaka: dto.feeTaka,
      visitId: visit.id,
    };
  }

  async getPendingBills() {
    const rows = await this.db
      .select({
        bill: bills,
        patient: patients,
        visit: visits,
      })
      .from(bills)
      .innerJoin(patients, eq(bills.patientId, patients.id))
      .leftJoin(visits, eq(bills.visitId, visits.id))
      .where(
        and(
          eq(bills.status, 'draft'),
          sql`${bills.duePaisa} > 0`,
          or(
            sql`${bills.notes} LIKE '%isLockedByHandler%'`,
            eq(visits.currentLocation, 'cashier'),
          ),
          sql`(${visits.status} IS NULL OR ${visits.status} NOT IN ('checked_out', 'cancelled'))`,
        ),
      )
      .orderBy(desc(bills.createdAt));

    const billIds = rows.map((r) => r.bill.id);
    const items =
      billIds.length > 0
        ? await this.db
            .select()
            .from(billItems)
            .where(sql`${billItems.billId} IN ${billIds}`)
        : [];

    return rows.map((r) => {
      let parsedNotes: any = null;
      try {
        if (r.bill.notes) {
          parsedNotes = JSON.parse(r.bill.notes);
        }
      } catch {}

      const bItems = items.filter((it) => it.billId === r.bill.id);

      return {
        ...r.bill,
        totalTaka: Math.round(r.bill.totalPaisa / 100),
        dueTaka: Math.round(r.bill.duePaisa / 100),
        handlerNotes: parsedNotes?.handlerNotes || null,
        modalityCode: parsedNotes?.modalityCode || 'PHYSIO',
        isLockedByHandler: Boolean(parsedNotes?.isLockedByHandler),
        patient: {
          id: r.patient.id,
          mrn: r.patient.mrn,
          nameEn: r.patient.nameEn,
          nameBn: r.patient.nameBn,
          phone: r.patient.phone,
          gender: r.patient.gender,
          ageYears: r.patient.ageYears,
        },
        visit: r.visit
          ? {
              id: r.visit.id,
              tokenNumber: r.visit.tokenNumber,
              currentLocation: r.visit.currentLocation,
              status: r.visit.status,
            }
          : null,
        items: bItems,
      };
    });
  }

  async switchRoom(
    actor: { sub?: string; role?: string },
    dto: SwitchTherapyRoomDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const roomRows = await this.db
      .select()
      .from(rooms)
      .where(
        or(
          eq(rooms.id, dto.targetRoomId),
          eq(rooms.roomNumber, dto.targetRoomId),
          eq(rooms.code, dto.targetRoomId),
        ),
      );

    let room = roomRows[0];
    if (!room) {
      const fallbackRooms = [
        { id: 'room-th-01', name: 'Male Physiotherapy & Rehab Hall', type: 'therapy_hall' },
        { id: 'room-th-02', name: 'Female Physiotherapy & Rehab Hall', type: 'therapy_hall' },
        { id: 'room-tr-01', name: 'Private Therapy Suite 1', type: 'therapy_room' },
      ];
      const fb = fallbackRooms.find(
        (r) => r.id === dto.targetRoomId || r.name.toLowerCase().includes(dto.targetRoomId.toLowerCase()),
      );
      if (fb) {
        room = fb as any;
      }
    }

    if (!room) {
      throw new NotFoundException('Target room not found');
    }

    const type = (room.type || '').toLowerCase();
    const name = (room.name || '').toLowerCase();
    const id = (room.id || '').toLowerCase();
    const isTherapy =
      type === 'therapy_room' ||
      type === 'therapy_hall' ||
      id.includes('th-') ||
      id.includes('tr-') ||
      id.includes('therapy') ||
      name.includes('therapy') ||
      name.includes('hall') ||
      name.includes('rehab') ||
      name.includes('থেরাপি');

    if (!isTherapy) {
      throw new BadRequestException('Target room must be a therapy room or hall');
    }

    const today = new Date().toISOString().slice(0, 10);
    let occupiedVisits: any[] = [];
    try {
      occupiedVisits = await this.db
        .select()
        .from(visits)
        .where(
          and(
            eq(visits.visitDate, today),
            or(
              eq(visits.roomId, room.id),
              eq(visits.calledRoomId, room.id),
            ),
            sql`${visits.status} IN ('calling', 'in_therapy')`,
            sql`${visits.id} != ${dto.visitId}`,
          ),
        );
    } catch {
      try {
        occupiedVisits = await this.db
          .select()
          .from(visits)
          .where(
            and(
              eq(visits.visitDate, today),
              eq(visits.roomId, room.id),
              sql`${visits.status} IN ('calling', 'in_therapy')`,
              sql`${visits.id} != ${dto.visitId}`,
            ),
          );
      } catch {
        occupiedVisits = [];
      }
    }

    if (occupiedVisits.length > 0) {
      throw new BadRequestException('Target room is currently occupied. Please choose an empty room.');
    }

    const now = new Date().toISOString();
    try {
      await this.db
        .update(visits)
        .set({
          roomId: room.id,
          calledRoomId: room.id,
          calledRoomName: room.name,
          updatedAt: now,
        })
        .where(eq(visits.id, dto.visitId));
    } catch {
      try {
        (this.db as any).session?.client
          ?.prepare('UPDATE visits SET room_id = ?, updated_at = ? WHERE id = ?')
          ?.run(room.id, now, dto.visitId);
      } catch {}
    }

    const payload = {
      visitId: dto.visitId,
      roomId: room.id,
      targetRoomId: room.id,
      roomName: room.name,
      switchedAt: now,
    };

    try {
      this.gateway?.emit('clinic:global', 'therapy.room_switched', payload);
    } catch {}
    try {
      this.realtime?.publish('therapy.room_switched', payload);
    } catch {}

    try {
      await this.audit.log({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'therapy.switch_room',
        entity: 'visits',
        entityId: dto.visitId,
        after: payload,
        ip: meta.ip,
        requestId: meta.requestId,
      });
    } catch {}

    return { ok: true, roomId: room.id, roomName: room.name };
  }

  async getPatientPlans(patientId: string) {
    const rows = await this.db
      .select({
        plan: therapyPlans,
        modality: modalities,
      })
      .from(therapyPlans)
      .leftJoin(modalities, eq(therapyPlans.modalityCode, modalities.code))
      .where(
        and(
          eq(therapyPlans.patientId, patientId),
          eq(therapyPlans.status, 'active'),
        ),
      )
      .orderBy(desc(therapyPlans.createdAt));

    return rows.map((r) => ({
      ...r.plan,
      modalityNameEn: r.modality?.nameEn || r.plan.modalityCode,
      modalityNameBn: r.modality?.nameBn || r.plan.modalityCode,
      defaultDurationMin: r.modality?.defaultDurationMin || 20,
    }));
  }

  async createPlans(
    actor: { sub?: string; role?: string },
    dto: CreateTherapyPlansDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const createdPlans = [];

    for (const plan of dto.plans) {
      const row = {
        id: randomUUID(),
        consultationId: dto.consultationId ?? null,
        visitId: dto.visitId ?? null,
        patientId: dto.patientId,
        doctorId: actor.sub || 'doctor',
        modalityCode: plan.modalityCode,
        totalSessionsPrescribed: plan.totalSessionsPrescribed ?? 10,
        completedSessions: 0,
        frequency: plan.frequency ?? 'daily',
        notes: plan.notes ?? null,
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.insert(therapyPlans).values(row);
      createdPlans.push(row);
    }

    const payload = { patientId: dto.patientId, plans: createdPlans };
    this.gateway.emit('clinic:global', 'therapy.plan_created', payload);
    this.realtime?.publish('therapy.plan_created', payload);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy.plans_create',
      entity: 'therapy_plans',
      entityId: dto.patientId,
      after: payload,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return createdPlans;
  }
}
