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
  beds,
  machines,
  modalities,
  packageCredits,
  packages,
  patients,
  rooms,
  staff,
  therapyPlans,
  therapySessions,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  CompleteSessionDto,
  CreateBedDto,
  CreateMachineDto,
  CreatePackageDto,
  PurchasePackageDto,
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

    // Prevent bed conflict
    if (dto.bedId) {
      const activeBedSession = await this.db
        .select()
        .from(therapySessions)
        .where(and(eq(therapySessions.bedId, dto.bedId), eq(therapySessions.status, 'in_progress')));
      if (activeBedSession.length > 0) {
        throw new BadRequestException('Bed is currently occupied by another active session');
      }
    }

    // Prevent machine conflict
    if (dto.machineId) {
      const activeMachineSession = await this.db
        .select()
        .from(therapySessions)
        .where(and(eq(therapySessions.machineId, dto.machineId), eq(therapySessions.status, 'in_progress')));
      if (activeMachineSession.length > 0) {
        throw new BadRequestException('Machine is currently in use by another active session');
      }
    }

    let effectiveTherapistId = dto.therapistStaffId;
    if (!effectiveTherapistId) {
      const staffRows = await this.db
        .select()
        .from(staff)
        .where(eq(staff.id, therapistStaffId));
      if (staffRows.length > 0) {
        effectiveTherapistId = staffRows[0].id;
      } else {
        const anyHandler = await this.db
          .select()
          .from(staff)
          .where(and(eq(staff.role, 'handler'), eq(staff.isActive, 1)))
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
      bedId: dto.bedId ?? null,
      machineId: dto.machineId ?? null,
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
      bedId: dto.bedId ?? null,
      machineId: dto.machineId ?? null,
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
      .select()
      .from(packageCredits)
      .where(and(eq(packageCredits.patientId, session.patientId), eq(packageCredits.status, 'active')))
      .limit(1);
    if (creditRows[0]) {
      const rem = creditRows[0].remainingSessions - 1;
      await this.db
        .update(packageCredits)
        .set({
          remainingSessions: rem,
          status: rem <= 0 ? 'exhausted' : 'active',
          updatedAt: now,
        })
        .where(eq(packageCredits.id, creditRows[0].id));
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
        bed: beds,
        machine: machines,
        therapist: staff,
      })
      .from(therapySessions)
      .innerJoin(patients, eq(therapySessions.patientId, patients.id))
      .leftJoin(beds, eq(therapySessions.bedId, beds.id))
      .leftJoin(machines, eq(therapySessions.machineId, machines.id))
      .leftJoin(staff, eq(therapySessions.therapistStaffId, staff.id))
      .orderBy(desc(therapySessions.createdAt));

    return rows.map((r) => ({
      ...r.session,
      patientName: r.patient.nameEn,
      patientMrn: r.patient.mrn,
      bedCode: r.bed?.code ?? null,
      machineCode: r.machine?.code ?? null,
      therapistName: r.therapist?.fullName ?? 'Therapist',
    }));
  }

  async getOccupancy() {
    const allRooms = await this.db.select().from(rooms);
    const allBeds = await this.db.select().from(beds);
    const allMachines = await this.db.select().from(machines);

    const activeSessions = await this.db
      .select({
        session: therapySessions,
        patient: patients,
      })
      .from(therapySessions)
      .innerJoin(patients, eq(therapySessions.patientId, patients.id))
      .where(eq(therapySessions.status, 'in_progress'));

    const bedOccupancy = allBeds.map((b) => {
      const active = activeSessions.find((s) => s.session.bedId === b.id);
      return {
        ...b,
        isOccupied: !!active,
        patientName: active?.patient.nameEn ?? null,
        patientMrn: active?.patient.mrn ?? null,
        modalityCode: active?.session.modalityCode ?? null,
        startedAt: active?.session.startedAt ?? null,
      };
    });

    const machineOccupancy = allMachines.map((m) => {
      const active = activeSessions.find((s) => s.session.machineId === m.id);
      return {
        ...m,
        isInUse: !!active,
        patientName: active?.patient.nameEn ?? null,
        modalityCode: active?.session.modalityCode ?? null,
      };
    });

    return {
      rooms: allRooms,
      beds: bedOccupancy,
      machines: machineOccupancy,
      totalActiveSessions: activeSessions.length,
    };
  }

  // --- Beds and Machines CRUD ------------------------------------------------

  async listBeds() {
    return this.db.select().from(beds);
  }

  async createBed(
    actor: { sub?: string; role?: string },
    dto: CreateBedDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const row = {
      id: randomUUID(),
      roomId: dto.roomId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      isActive: 1,
    };
    await this.db.insert(beds).values(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'beds.create',
      entity: 'beds',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return row;
  }

  async listMachines() {
    return this.db.select().from(machines);
  }

  async createMachine(
    actor: { sub?: string; role?: string },
    dto: CreateMachineDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const row = {
      id: randomUUID(),
      roomId: dto.roomId ?? null,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      modalityCode: dto.modalityCode ?? null,
      status: 'available' as const,
      lastServicedAt: null,
      nextServiceDue: null,
      isActive: 1,
    };
    await this.db.insert(machines).values(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'machines.create',
      entity: 'machines',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return row;
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
    const row = {
      id: randomUUID(),
      nameEn: dto.nameEn.trim(),
      nameBn: dto.nameBn?.trim() || dto.nameEn.trim(),
      totalConsultations: dto.totalConsultations,
      totalTherapySessions: dto.totalTherapySessions,
      validityDays: dto.validityDays,
      pricePaisa: dto.pricePaisa,
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

    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000).toISOString();
    const creditId = randomUUID();

    const row = {
      id: creditId,
      patientId: dto.patientId,
      packageId: dto.packageId,
      billId: dto.billId ?? null,
      remainingConsultations: pkg.totalConsultations,
      remainingSessions: pkg.totalTherapySessions,
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
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }
}
