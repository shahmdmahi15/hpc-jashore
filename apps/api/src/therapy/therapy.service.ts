import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  modalities,
  packageCredits,
  packages,
  patients,
  patientTimelineEvents,
  rooms,
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
  MarkInTherapyDto,
  PurchasePackageDto,
  RecallTherapyPatientDto,
  StartSessionDto,
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

    let effectiveTherapistId = dto.therapistStaffId;
    if (!effectiveTherapistId) {
      const staffRows = await this.db
        .select()
        .from(users)
        .where(eq(users.id, therapistStaffId));
      if (staffRows.length > 0) {
        effectiveTherapistId = staffRows[0].id;
      } else {
        const anyHandler = await this.db
          .select()
          .from(users)
          .where(and(eq(users.role, 'handler'), eq(users.approvalStatus, 'approved'), eq(users.isActive, 1)))
          .limit(1);
        effectiveTherapistId = anyHandler[0]?.id ?? therapistStaffId;
      }
    }

    const now = new Date().toISOString();
    const sessionId = randomUUID();
    const row = {
      id: sessionId,
      planId: dto.planId ?? null,
      patientId: dto.patientId,
      therapistStaffId: effectiveTherapistId,
      bedId: null,
      modalityCode: dto.modalityCode,
      status: 'in_progress' as const,
      startedAt: now,
      endedAt: null,
      durationMinutes: 0,
      outcomeNote: null,
      painScoreAfter: null,
      isOvertime: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(therapySessions).values(row);

    const payload = {
      sessionId,
      patientId: dto.patientId,
      patientName: patientRows[0].nameEn,
      modalityCode: dto.modalityCode,
      bedId: null,
      therapistStaffId,
      startedAt: now,
    };

    this.gateway.emit('clinic:global', 'session.started', payload);
    this.realtime.publish('session.started', payload);

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
    const allRooms = await this.db.select().from(rooms).orderBy(rooms.roomNumber);
    return allRooms.map((r) => ({
      id: r.id,
      name: r.name || `Room ${r.roomNumber}`,
      code: String(r.roomNumber),
      roomNumber: r.roomNumber,
      type: r.type,
      isOccupied: false,
      currentPatientName: null,
    }));
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

    const nowServing: any[] = [];
    const waiting: any[] = [];

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
        status: isCalling ? 'calling' : v.status === 'in_therapy' ? 'in_therapy' : 'waiting',
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

      if (isCalling) {
        nowServing.push(item);
      } else if (v.status !== 'checked_out' && v.status !== 'cancelled') {
        waiting.push(item);
      }
    }

    return {
      waiting,
      nowServing,
      activeSessions: activeSessions.map(({ session: s, patient: p, modality: m }) => ({
        sessionId: s.id,
        patientId: p.id,
        patientNameEn: p.nameEn,
        patientNameBn: p.nameBn,
        mrn: p.mrn,
        bedName: null,
        modalityCode: s.modalityCode,
        modalityNameEn: m?.nameEn || s.modalityCode,
        modalityNameBn: m?.nameBn || s.modalityCode,
        startedAt: s.startedAt,
        durationMinutes: s.durationMinutes || 20,
      })),
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

    const targetRoomId = dto.roomId || 'therapy-hall-1';
    const targetRoomName = dto.roomName || 'Therapy Hall 1';

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

    const payload = {
      visitId: visitRow.id,
      patientId: patient?.id,
      tokenNumber: visitRow.tokenNumber,
      patientNameEn: patient?.nameEn || 'Patient',
      patientNameBn: patient?.nameBn || patient?.nameEn,
      roomId: targetRoomId,
      roomName: targetRoomName,
      roomNumber: dto.roomNumber || 1,
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

    const payload = {
      visitId: visitRow.id,
      patientId: patient?.id,
      tokenNumber: visitRow.tokenNumber,
      patientNameEn: patient?.nameEn || 'Patient',
      patientNameBn: patient?.nameBn || patient?.nameEn,
      roomId: dto.roomId || visitRow.roomId,
      roomName: dto.roomName || 'Therapy Room 1',
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
}
