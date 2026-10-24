import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, like, or, count, sql, asc } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { nextMrn } from '../common/mrn.util';
import { paged } from '../common/pagination.dto';
import { DB, type Db } from '../db/db.module';
import {
  bills,
  billItems,
  consultationBookings,
  dues,
  packageCredits,
  patientIntakeForms,
  patients,
  patientTimelineEvents,
  payments,
  rooms,
  sequences,
  serials,
  staff,
  users,
  visits,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  CreatePatientDto,
  UpdatePatientDto,
  CreateIntakeFormDto,
  AdmitToQueueDto,
  CreateTimelineEventDto,
} from './dto';

@Injectable()
export class PatientsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    @Optional() private readonly gateway?: EventsGateway,
  ) {}

  async search(q?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const cleanQ = q?.trim();

    let whereClause = isNull(patients.deletedAt);
    if (cleanQ) {
      const pattern = `%${cleanQ}%`;
      whereClause = and(
        isNull(patients.deletedAt),
        or(
          like(patients.mrn, pattern),
          like(patients.phone, pattern),
          like(patients.nameEn, pattern),
          like(patients.nameBn, pattern),
          like(patients.email, pattern),
          like(patients.occupation, pattern),
          like(patients.address, pattern),
          like(patients.notes, pattern),
        ),
      )!;
    }

    const rows = await this.db
      .select()
      .from(patients)
      .where(whereClause)
      .orderBy(desc(patients.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(patients)
      .where(whereClause);

    return paged(rows, total, page, limit);
  }

  async create(
    actor: { sub?: string; role?: string },
    dto: CreatePatientDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const existing = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.phone, dto.phone), isNull(patients.deletedAt)));
    if (existing.length > 0) {
      throw new BadRequestException('A patient with this phone number is already registered');
    }

    const year = new Date().getFullYear();
    const mrn = nextMrn(this.db, year);

    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      mrn,
      nameEn: dto.nameEn.trim(),
      nameBn: dto.nameBn?.trim() ?? null,
      phone: dto.phone.trim(),
      email: dto.email?.trim().toLowerCase() ?? null,
      ageYears: dto.ageYears ?? null,
      gender: dto.gender,
      bloodGroup: dto.bloodGroup?.trim().toUpperCase() ?? null,
      address: dto.address?.trim() ?? null,
      occupation: (dto.profession ?? dto.occupation)?.trim() ?? null,
      emergencyContact: dto.emergencyContact?.trim() ?? null,
      allergies: dto.allergies?.trim() ?? null,
      chronicConditions: dto.chronicConditions?.trim() ?? null,
      contraindications: dto.contraindications?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
      consentSigned: 1,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(patients).values(row);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'patients.create',
      entity: 'patients',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }

  async get(id: string) {
    const rows = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)));
    const patient = rows[0];
    if (!patient) throw new NotFoundException('Patient not found');

    const patientVisits = await this.db
      .select()
      .from(visits)
      .where(eq(visits.patientId, id))
      .orderBy(desc(visits.visitDate))
      .limit(10);

    const credits = await this.db
      .select()
      .from(packageCredits)
      .where(and(eq(packageCredits.patientId, id), eq(packageCredits.status, 'active')));

    const patientDues = await this.db
      .select()
      .from(dues)
      .where(and(eq(dues.patientId, id), eq(dues.status, 'pending')));

    return {
      ...patient,
      visits: patientVisits,
      activePackageCredits: credits,
      outstandingDues: patientDues,
    };
  }

  async update(
    actor: { sub?: string; role?: string },
    id: string,
    dto: UpdatePatientDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const before = await this.get(id);

    const patch: Partial<typeof patients.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (dto.nameEn !== undefined) patch.nameEn = dto.nameEn.trim();
    if (dto.nameBn !== undefined) patch.nameBn = dto.nameBn.trim();
    if (dto.phone !== undefined) {
      const conflict = await this.db
        .select()
        .from(patients)
        .where(and(eq(patients.phone, dto.phone.trim()), isNull(patients.deletedAt)));
      if (conflict[0] && conflict[0].id !== id) {
        throw new BadRequestException('Another patient is registered with this phone number');
      }
      patch.phone = dto.phone.trim();
    }
    if (dto.email !== undefined) patch.email = dto.email ? dto.email.trim().toLowerCase() : null;
    if (dto.ageYears !== undefined) patch.ageYears = dto.ageYears;
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.bloodGroup !== undefined) patch.bloodGroup = dto.bloodGroup.trim().toUpperCase();
    if (dto.address !== undefined) patch.address = dto.address.trim();
    if (dto.occupation !== undefined || dto.profession !== undefined) {
      patch.occupation = (dto.profession ?? dto.occupation)?.trim() ?? null;
    }
    if (dto.emergencyContact !== undefined) patch.emergencyContact = dto.emergencyContact.trim();
    if (dto.allergies !== undefined) patch.allergies = dto.allergies.trim();
    if (dto.chronicConditions !== undefined) patch.chronicConditions = dto.chronicConditions.trim();
    if (dto.contraindications !== undefined) patch.contraindications = dto.contraindications.trim();
    if (dto.notes !== undefined) patch.notes = dto.notes ? dto.notes.trim() : null;
    if (dto.consentSigned !== undefined) patch.consentSigned = dto.consentSigned ? 1 : 0;

    await this.db.update(patients).set(patch).where(eq(patients.id, id));
    const after = await this.get(id);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'patients.update',
      entity: 'patients',
      entityId: id,
      before,
      after,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return after;
  }

  async remove(
    actor: { sub?: string; role?: string },
    id: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const before = await this.get(id);
    const now = new Date().toISOString();
    await this.db
      .update(patients)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(patients.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'patients.soft_delete',
      entity: 'patients',
      entityId: id,
      before,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, deletedAt: now };
  }

  // --- Sequences Helpers ------------------------------------------------------
  private async nextTokenNumber(year: number): Promise<number> {
    const existing = await this.db
      .select()
      .from(sequences)
      .where(and(eq(sequences.scope, 'token'), eq(sequences.year, year)));

    if (existing.length === 0) {
      await this.db
        .insert(sequences)
        .values({ scope: 'token', year, lastValue: 1 });
      return 1;
    }
    const nextVal = existing[0].lastValue + 1;
    await this.db
      .update(sequences)
      .set({ lastValue: nextVal })
      .where(and(eq(sequences.scope, 'token'), eq(sequences.year, year)));
    return nextVal;
  }

  private async nextBillNumber(year: number): Promise<string> {
    const existing = await this.db
      .select()
      .from(sequences)
      .where(and(eq(sequences.scope, 'bill'), eq(sequences.year, year)));

    let nextVal = 1;
    if (existing.length === 0) {
      await this.db
        .insert(sequences)
        .values({ scope: 'bill', year, lastValue: 1 });
    } else {
      nextVal = existing[0].lastValue + 1;
      await this.db
        .update(sequences)
        .set({ lastValue: nextVal })
        .where(and(eq(sequences.scope, 'bill'), eq(sequences.year, year)));
    }
    const yy = String(year).slice(-2);
    const seqStr = String(nextVal).padStart(5, '0');
    return `BILL-${yy}-${seqStr}`;
  }

  // --- Patient Timeline Tracking ----------------------------------------------
  async addPatientTimelineEvent(event: {
    patientId: string;
    visitId?: string | null;
    consultationBookingId?: string | null;
    intakeFormId?: string | null;
    step: string;
    titleEn: string;
    titleBn: string;
    descriptionEn?: string | null;
    descriptionBn?: string | null;
    actorId?: string | null;
    actorName?: string | null;
    actorRole?: string | null;
    metadataJson?: string | null;
    date?: string | null;
    occurredAt?: string | null;
  }) {
    const id = randomUUID();
    const today = event.date || new Date().toISOString().slice(0, 10);
    const occurredAt = event.occurredAt || new Date().toISOString();
    const row = {
      id,
      patientId: event.patientId,
      visitId: event.visitId ?? null,
      consultationBookingId: event.consultationBookingId ?? null,
      intakeFormId: event.intakeFormId ?? null,
      step: event.step,
      titleEn: event.titleEn,
      titleBn: event.titleBn,
      descriptionEn: event.descriptionEn ?? null,
      descriptionBn: event.descriptionBn ?? null,
      actorId: event.actorId ?? null,
      actorName: event.actorName ?? null,
      actorRole: event.actorRole ?? null,
      metadataJson: event.metadataJson ?? null,
      occurredAt,
      date: today,
    };
    await this.db.insert(patientTimelineEvents).values(row);

    // Emit realtime timeline update
    this.gateway?.emit(`patient:${event.patientId}`, 'timeline.event', row);
    this.gateway?.emit('clinic:global', 'timeline.event', row);
    this.realtime?.publish('timeline.event', row);

    return row;
  }

  async getPatientTimeline(patientId: string, date?: string) {
    const whereClause = date
      ? and(eq(patientTimelineEvents.patientId, patientId), eq(patientTimelineEvents.date, date))
      : eq(patientTimelineEvents.patientId, patientId);

    const rows = await this.db
      .select()
      .from(patientTimelineEvents)
      .where(whereClause)
      .orderBy(desc(patientTimelineEvents.occurredAt));

    return rows;
  }

  // --- Reception Intake Form System -------------------------------------------
  async createIntakeForm(
    actor: { sub: string; role: string },
    dto: CreateIntakeFormDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const today = dto.date || now.slice(0, 10);
    const year = new Date().getFullYear();

    // 1. Resolve or Create Patient
    let patientId = dto.patientId;
    let patientRecord: any = null;

    if (patientId) {
      patientRecord = await this.get(patientId);
    } else {
      // Check by phone
      const cleanPhone = dto.phone.trim();
      const existingByPhone = await this.db
        .select()
        .from(patients)
        .where(eq(patients.phone, cleanPhone));

      if (existingByPhone.length > 0) {
        patientRecord = existingByPhone[0];
        patientId = patientRecord.id;
      } else {
        // Create new patient automatically
        const newPatientId = randomUUID();
        const mrn = await nextMrn(this.db);
        const newPatientRow = {
          id: newPatientId,
          mrn,
          nameEn: dto.name.trim(),
          nameBn: dto.name.trim(),
          phone: cleanPhone,
          ageYears: dto.ageYears ?? null,
          gender: dto.gender === 'female' ? ('female' as const) : ('male' as const),
          address: dto.address?.trim() ?? null,
          occupation: dto.occupation?.trim() ?? null,
          allergies: dto.drugAllergyDetails?.trim() ?? null,
          chronicConditions: dto.hasDiabetes ? 'Diabetes Mellitus' : null,
          consentSigned: 1,
          createdAt: now,
          updatedAt: now,
        };
        await this.db.insert(patients).values(newPatientRow);
        patientId = newPatientId;
        patientRecord = newPatientRow;

        // Log registration timeline event
        await this.addPatientTimelineEvent({
          patientId: newPatientId,
          step: 'registered',
          titleEn: 'Patient Registered',
          titleBn: 'নতুন রোগী নিবন্ধন',
          descriptionEn: `MRN: ${mrn} registered at Reception`,
          descriptionBn: `এমআরএন: ${mrn} সহযোগে রিসেপশনে নতুন রোগী নিবন্ধন সম্পন্ন হয়েছে।`,
          actorId: actor.sub,
          actorRole: actor.role,
          date: today,
        });
      }
    }

    // 2. Resolve or Create Today's Visit (Checked-in)
    const existingVisits = await this.db
      .select()
      .from(visits)
      .where(and(eq(visits.patientId, patientId!), eq(visits.visitDate, today)))
      .orderBy(desc(visits.createdAt))
      .limit(1);

    let visitId: string;
    let tokenNumber: number;

    if (existingVisits.length > 0) {
      visitId = existingVisits[0].id;
      tokenNumber = existingVisits[0].tokenNumber;
    } else {
      visitId = randomUUID();
      tokenNumber = await this.nextTokenNumber(year);
      await this.db.insert(visits).values({
        id: visitId,
        patientId: patientId!,
        tokenNumber,
        visitDate: today,
        status: 'checked_in',
        priority: 'normal',
        currentLocation: 'Reception',
        checkedInAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // Log checked_in timeline event
      await this.addPatientTimelineEvent({
        patientId: patientId!,
        visitId,
        step: 'checked_in',
        titleEn: 'Patient Checked In',
        titleBn: 'রোগীর চেক-ইন সম্পন্ন',
        descriptionEn: `Token #${tokenNumber} issued at Reception Desk`,
        descriptionBn: `টোকেন #${tokenNumber} সহ রিসেপশনে উপস্থিতি ও চেক-ইন সম্পন্ন হয়েছে।`,
        actorId: actor.sub,
        actorRole: actor.role,
        date: today,
      });
    }

    // 3. Resolve Actor Display Name
    const actorUser = await this.db.select().from(users).where(eq(users.id, actor.sub));
    const actorName = dto.receptionistName || actorUser[0]?.displayName || 'Receptionist';

    // 4. Create Intake Form
    const intakeId = randomUUID();
    const shouldForward = dto.forwardToCashier !== false;
    const initialStatus = shouldForward ? ('forwarded_to_cashier' as const) : ('submitted' as const);

    const intakeRow = {
      id: intakeId,
      patientId: patientId!,
      visitId,
      doctorId: dto.doctorId || null,
      receptionistId: actor.sub,
      receptionistName: actorName,
      date: today,
      name: dto.name.trim(),
      ageYears: dto.ageYears ?? null,
      phone: dto.phone.trim(),
      gender: dto.gender,
      occupation: dto.occupation?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      bpSystolic: dto.bpSystolic ?? null,
      bpDiastolic: dto.bpDiastolic ?? null,
      bloodSugar: dto.bloodSugar?.trim() ?? null,
      hasDiabetes: dto.hasDiabetes ? 1 : 0,
      weightKg: dto.weightKg?.trim() ?? null,
      chiefComplaint: dto.chiefComplaint?.trim() ?? null,
      problemDuration: dto.problemDuration?.trim() ?? null,
      seenDoctorBefore: dto.seenDoctorBefore ? 1 : 0,
      previousDoctorDetails: dto.previousDoctorDetails?.trim() ?? null,
      hasPreviousReports: dto.hasPreviousReports ? 1 : 0,
      previousReportNames: dto.previousReportNames?.trim() ?? null,
      takesRegularMedication: dto.takesRegularMedication ? 1 : 0,
      regularMedicationDetails: dto.regularMedicationDetails?.trim() ?? null,
      hasDrugAllergies: dto.hasDrugAllergies ? 1 : 0,
      drugAllergyDetails: dto.drugAllergyDetails?.trim() ?? null,
      referralSource: dto.referralSource?.trim() ?? null,
      referralOtherDetails: dto.referralOtherDetails?.trim() ?? null,
      specialNotes: dto.specialNotes?.trim() ?? null,
      status: initialStatus,
      forwardedToCashierAt: shouldForward ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(patientIntakeForms).values(intakeRow);

    // 5. Add Timeline Event: Intake Form Completed
    await this.addPatientTimelineEvent({
      patientId: patientId!,
      visitId,
      intakeFormId: intakeId,
      step: 'intake_completed',
      titleEn: 'Reception Intake Form Filled',
      titleBn: 'প্রাথমিক তথ্য ও রিসেপশন ফরম পূরণ',
      descriptionEn: `Intake form completed by ${actorName}`,
      descriptionBn: `রিসেপশনিস্ট ${actorName} কর্তৃক রোগীর প্রাথমিক তথ্য ও স্বাস্থ্য ফরম পূরণ সম্পন্ন।`,
      actorId: actor.sub,
      actorName,
      actorRole: actor.role,
      date: today,
    });

    // 6. If forwarded to cashier, add timeline event
    if (shouldForward) {
      await this.addPatientTimelineEvent({
        patientId: patientId!,
        visitId,
        intakeFormId: intakeId,
        step: 'forwarded_to_cashier',
        titleEn: 'Forwarded to Cashier',
        titleBn: 'ক্যাশিয়ারের কাছে ফরোয়ার্ড',
        descriptionEn: 'Forwarded to Cashier for fee collection and doctor queue admission',
        descriptionBn: 'কনসালটেশন ফি গ্রহণ ও ডাক্তার সিরিয়ালে প্রবেশের জন্য ক্যাশিয়ারের কাছে পাঠানো হয়েছে।',
        actorId: actor.sub,
        actorName,
        actorRole: actor.role,
        date: today,
      });
    }

    const result = {
      ...intakeRow,
      patient: patientRecord,
      tokenNumber,
    };

    // Emit Realtime Event
    this.gateway?.emit('clinic:global', 'intake.created', result);
    this.realtime?.publish('intake.created', result);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'patients.create_intake_form',
      entity: 'patient_intake_forms',
      entityId: intakeId,
      after: result,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return result;
  }

  async listIntakeForms(query: {
    date?: string;
    status?: string;
    doctorId?: string;
    patientId?: string;
    search?: string;
  }) {
    const today = query.date || new Date().toISOString().slice(0, 10);
    const conditions = [];

    if (query.date && query.date !== 'all') {
      conditions.push(eq(patientIntakeForms.date, query.date));
    } else if (!query.date) {
      conditions.push(eq(patientIntakeForms.date, today));
    }

    if (query.status && query.status !== 'all') {
      conditions.push(eq(patientIntakeForms.status, query.status as any));
    }

    if (query.doctorId && query.doctorId !== 'all') {
      conditions.push(eq(patientIntakeForms.doctorId, query.doctorId));
    }

    if (query.patientId) {
      conditions.push(eq(patientIntakeForms.patientId, query.patientId));
    }

    if (query.search && query.search.trim()) {
      const pattern = `%${query.search.trim()}%`;
      conditions.push(
        or(
          like(patientIntakeForms.name, pattern),
          like(patientIntakeForms.phone, pattern),
          like(patientIntakeForms.chiefComplaint, pattern),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        form: patientIntakeForms,
        patient: patients,
        visit: visits,
        doctor: staff,
        chamber: rooms,
      })
      .from(patientIntakeForms)
      .innerJoin(patients, eq(patientIntakeForms.patientId, patients.id))
      .leftJoin(visits, eq(patientIntakeForms.visitId, visits.id))
      .leftJoin(staff, eq(patientIntakeForms.doctorId, staff.id))
      .leftJoin(rooms, eq(staff.chamberRoomId, rooms.id))
      .where(whereClause)
      .orderBy(desc(patientIntakeForms.createdAt));

    return rows.map((r) => ({
      ...r.form,
      patient: r.patient,
      tokenNumber: r.visit?.tokenNumber,
      doctor: r.doctor
        ? {
            id: r.doctor.id,
            fullName: r.doctor.fullName,
            phone: r.doctor.phone,
            chamber: r.chamber ? `Room ${r.chamber.roomNumber} (${r.chamber.name})` : 'Chamber 1',
            chamberRoomNumber: r.chamber?.roomNumber,
          }
        : null,
    }));
  }

  async getIntakeForm(id: string) {
    const rows = await this.db
      .select({
        form: patientIntakeForms,
        patient: patients,
        visit: visits,
        doctor: staff,
        chamber: rooms,
      })
      .from(patientIntakeForms)
      .innerJoin(patients, eq(patientIntakeForms.patientId, patients.id))
      .leftJoin(visits, eq(patientIntakeForms.visitId, visits.id))
      .leftJoin(staff, eq(patientIntakeForms.doctorId, staff.id))
      .leftJoin(rooms, eq(staff.chamberRoomId, rooms.id))
      .where(eq(patientIntakeForms.id, id));

    const item = rows[0];
    if (!item) throw new NotFoundException('Patient intake form not found');

    return {
      ...item.form,
      patient: item.patient,
      tokenNumber: item.visit?.tokenNumber,
      doctor: item.doctor
        ? {
            id: item.doctor.id,
            fullName: item.doctor.fullName,
            phone: item.doctor.phone,
            chamber: item.chamber ? `Room ${item.chamber.roomNumber} (${item.chamber.name})` : 'Chamber 1',
            chamberRoomNumber: item.chamber?.roomNumber,
          }
        : null,
    };
  }

  async forwardIntakeFormToCashier(
    actor: { sub: string; role: string },
    id: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const existing = await this.getIntakeForm(id);
    const now = new Date().toISOString();

    await this.db
      .update(patientIntakeForms)
      .set({
        status: 'forwarded_to_cashier',
        forwardedToCashierAt: now,
        updatedAt: now,
      })
      .where(eq(patientIntakeForms.id, id));

    // Log timeline event
    await this.addPatientTimelineEvent({
      patientId: existing.patientId,
      visitId: existing.visitId,
      intakeFormId: id,
      step: 'forwarded_to_cashier',
      titleEn: 'Forwarded to Cashier',
      titleBn: 'ক্যাশিয়ারের কাছে ফরোয়ার্ড',
      descriptionEn: 'Forwarded to Cashier for consultation fee payment & queue admission',
      descriptionBn: 'কনসালটেশন ফি গ্রহণ ও সিরিয়াল অন্তর্ভুক্তির জন্য ক্যাশিয়ারের কাছে পাঠানো হয়েছে।',
      actorId: actor.sub,
      actorRole: actor.role,
    });

    const updated = await this.getIntakeForm(id);

    // Emit realtime events
    this.gateway?.emit('clinic:global', 'intake.forwarded', updated);
    this.realtime?.publish('intake.forwarded', updated);

    return updated;
  }

  async admitIntakeFormToQueue(
    actor: { sub: string; role: string },
    id: string,
    dto: AdmitToQueueDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const intake = await this.getIntakeForm(id);
    const now = new Date().toISOString();
    const today = intake.date || now.slice(0, 10);
    const year = new Date().getFullYear();

    // 1. Resolve Doctor
    const effectiveDoctorId = dto.doctorId || intake.doctorId;
    if (!effectiveDoctorId) {
      throw new BadRequestException('Please select a doctor to admit to consultation queue');
    }

    const doctorRows = await this.db
      .select({
        staff: staff,
        user: users,
        chamber: rooms,
      })
      .from(staff)
      .leftJoin(users, eq(staff.userId, users.id))
      .leftJoin(rooms, eq(staff.chamberRoomId, rooms.id))
      .where(or(eq(staff.id, effectiveDoctorId), eq(staff.userId, effectiveDoctorId)));

    const docItem = doctorRows[0];
    if (!docItem) throw new NotFoundException('Doctor not found');

    const doctorName = docItem.user?.displayName || docItem.staff.fullName;
    const chamberNumber = docItem.chamber?.roomNumber || '101';
    const chamberName = docItem.chamber?.name || `Chamber ${chamberNumber}`;

    // 2. Resolve Consultation Fee & Payment
    const feeTaka = dto.feeTaka !== undefined
      ? dto.feeTaka
      : (docItem.user?.consultationFeePaisa ? Math.round(docItem.user.consultationFeePaisa / 100) : 500);
    const feePaisa = feeTaka * 100;
    const paymentMethod = dto.paymentMethod || 'cash';

    // 3. Ensure Visit exists
    let visitId = intake.visitId;
    let tokenNumber = intake.tokenNumber;

    if (!visitId) {
      visitId = randomUUID();
      tokenNumber = await this.nextTokenNumber(year);
      await this.db.insert(visits).values({
        id: visitId,
        patientId: intake.patientId,
        tokenNumber,
        visitDate: today,
        status: 'checked_in',
        priority: 'normal',
        currentLocation: 'Waiting Room',
        checkedInAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Create Bill & Payment records for Cashier
    if (feePaisa > 0) {
      const billId = randomUUID();
      const billNumber = await this.nextBillNumber(year);
      await this.db.insert(bills).values({
        id: billId,
        billNumber,
        patientId: intake.patientId,
        visitId,
        subtotalPaisa: feePaisa,
        discountPaisa: 0,
        totalPaisa: feePaisa,
        paidPaisa: feePaisa,
        duePaisa: 0,
        status: 'posted',
        paymentMethod,
        notes: `Consultation fee collected at cashier - Dr. ${doctorName}`,
        createdAt: now,
        updatedAt: now,
      });

      await this.db.insert(billItems).values({
        id: randomUUID(),
        billId,
        itemType: 'consultation',
        description: `Doctor Consultation - ${doctorName}`,
        quantity: 1,
        unitPricePaisa: feePaisa,
        discountPaisa: 0,
        totalPaisa: feePaisa,
      });

      await this.db.insert(payments).values({
        id: randomUUID(),
        billId,
        patientId: intake.patientId,
        amountPaisa: feePaisa,
        method: (paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'rocket' || paymentMethod === 'card' || paymentMethod === 'bank') ? paymentMethod : 'cash',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 5. Generate Serial Number for this doctor today
    const priorSerials = await this.db
      .select()
      .from(serials)
      .where(and(eq(serials.doctorId, docItem.staff.id), eq(serials.date, today)));

    const nextSerialNum = priorSerials.length + 1;
    const serialId = randomUUID();

    await this.db.insert(serials).values({
      id: serialId,
      doctorId: docItem.staff.id,
      date: today,
      serialNumber: nextSerialNum,
      visitId,
      patientId: intake.patientId,
      status: 'waiting',
      calledAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // 6. Create Consultation Booking record
    const bookingId = randomUUID();
    const yy = String(year).slice(-2);
    const bookingNumber = `CB-${yy}-${String(Date.now()).slice(-6)}`;

    await this.db.insert(consultationBookings).values({
      id: bookingId,
      bookingNumber,
      patientId: intake.patientId,
      doctorId: docItem.staff.id,
      bookingDate: today,
      slotTime: 'Walk-in',
      visitType: 'new_consultation',
      feePaisa,
      serialNumber: nextSerialNum,
      status: 'in_queue',
      checkedInAt: now,
      inQueueAt: now,
      queuedBy: actor.sub,
      serialId,
      visitId,
      bookedBy: actor.sub,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Update Visit
    await this.db
      .update(visits)
      .set({
        status: 'checked_in',
        doctorId: docItem.staff.id,
        consultationBookingId: bookingId,
        currentLocation: 'Waiting Room',
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    // 8. Update Intake Form
    await this.db
      .update(patientIntakeForms)
      .set({
        status: 'in_queue',
        doctorId: docItem.staff.id,
        visitId,
        consultationBookingId: bookingId,
        billedAt: now,
        queuedAt: now,
        updatedAt: now,
      })
      .where(eq(patientIntakeForms.id, id));

    // 9. Add Timeline Events
    // Step A: Fee Collected
    await this.addPatientTimelineEvent({
      patientId: intake.patientId,
      visitId,
      intakeFormId: id,
      consultationBookingId: bookingId,
      step: 'fee_collected',
      titleEn: 'Consultation Fee Paid',
      titleBn: 'কনসালটেশন ফি গ্রহণ সম্পন্ন',
      descriptionEn: `৳${feeTaka} collected via ${paymentMethod.toUpperCase()}`,
      descriptionBn: `ক্যাশিয়ার কর্তৃক ৳${feeTaka} ফি গ্রহণ সম্পন্ন হয়েছে (${paymentMethod})।`,
      actorId: actor.sub,
      actorRole: actor.role,
      date: today,
    });

    // Step B: Admitted to Doctor Consultation Queue
    await this.addPatientTimelineEvent({
      patientId: intake.patientId,
      visitId,
      intakeFormId: id,
      consultationBookingId: bookingId,
      step: 'queued_consultation',
      titleEn: 'Admitted to Doctor Queue',
      titleBn: 'ডাক্তার কনসালটেশন সিরিয়ালে অন্তর্ভুক্তি',
      descriptionEn: `Token #${tokenNumber} (Serial #${nextSerialNum}) queued for Dr. ${doctorName} (Room ${chamberNumber})`,
      descriptionBn: `টোকেন #${tokenNumber} (সিরিয়াল #${nextSerialNum}) সহ ডা. ${doctorName}-এর চেম্বার সিরিয়ালে প্রবেশ করানো হয়েছে (রুম ${chamberNumber})।`,
      actorId: actor.sub,
      actorRole: actor.role,
      date: today,
    });

    const payload = {
      intakeId: id,
      patientId: intake.patientId,
      visitId,
      bookingId,
      serialId,
      tokenNumber,
      serialNumber: nextSerialNum,
      doctorId: docItem.staff.id,
      doctorName,
      chamberNumber,
      chamberName,
      feeTaka,
      paymentMethod,
    };

    // Emit realtime events to TV and all connected workstations
    this.gateway?.emit('clinic:global', 'intake.queued', payload);
    this.gateway?.emit('clinic:global', 'queue.updated', { doctorId: docItem.staff.id });
    this.gateway?.emit('clinic:global', 'serial.created', payload);
    this.realtime?.publish('intake.queued', payload);
    this.realtime?.publish('queue.updated', { doctorId: docItem.staff.id });

    return payload;
  }
}
