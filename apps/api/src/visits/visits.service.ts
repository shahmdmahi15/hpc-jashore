import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  beds,
  bills,
  dues,
  modalities,
  patients,
  sequences,
  serials,
  staff,
  therapySessions,
  visits,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type { CallSerialDto, CheckInDto, CheckOutDto, RoutePatientDto } from './dto';

const todayDateString = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class VisitsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly gateway: EventsGateway,
    private readonly realtime: RealtimeService,
  ) {}

  private async nextTokenNumber(year: number): Promise<number> {
    return this.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(sequences)
        .where(and(eq(sequences.scope, 'token'), eq(sequences.year, year)))
        .all();
      if (existing.length === 0) {
        tx.insert(sequences).values({ scope: 'token', year, lastValue: 1 }).run();
        return 1;
      }
      const nextVal = existing[0].lastValue + 1;
      tx.update(sequences)
        .set({ lastValue: nextVal })
        .where(and(eq(sequences.scope, 'token'), eq(sequences.year, year)))
        .run();
      return nextVal;
    });
  }

  async checkIn(
    actor: { sub?: string; role?: string },
    dto: CheckInDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const patientRows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId));
    const patient = patientRows[0];
    if (!patient) throw new NotFoundException('Patient not found');

    const year = new Date().getFullYear();
    const tokenNumber = await this.nextTokenNumber(year);
    const today = todayDateString();
    const now = new Date().toISOString();

    const visitId = randomUUID();
    const visitRow = {
      id: visitId,
      patientId: patient.id,
      doctorId: dto.doctorId ?? null,
      tokenNumber,
      visitDate: today,
      status: 'checked_in' as const,
      priority: dto.priority ?? ('normal' as const),
      currentLocation: 'reception',
      checkedInAt: now,
      checkedOutAt: null,
      notes: dto.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(visits).values(visitRow);

    let serialRow = null;
    if (dto.doctorId) {
      const priorSerials = await this.db
        .select()
        .from(serials)
        .where(and(eq(serials.doctorId, dto.doctorId), eq(serials.date, today)));
      const nextSerialNum = priorSerials.length + 1;

      serialRow = {
        id: randomUUID(),
        doctorId: dto.doctorId,
        date: today,
        serialNumber: nextSerialNum,
        visitId,
        patientId: patient.id,
        status: 'waiting' as const,
        calledAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.insert(serials).values(serialRow);
    }

    // Broadcast realtime event
    const eventPayload = {
      visitId,
      patientId: patient.id,
      mrn: patient.mrn,
      patientName: patient.nameEn,
      tokenNumber,
      doctorId: dto.doctorId,
      serialNumber: serialRow?.serialNumber ?? null,
    };
    this.gateway.emit('clinic:global', 'visit.checked_in', eventPayload);
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: dto.doctorId });
    this.realtime.publish('visit.checked_in', eventPayload);
    this.realtime.publish('queue.updated', { doctorId: dto.doctorId });

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'visit.check_in',
      entity: 'visits',
      entityId: visitId,
      after: { ...visitRow, serialNumber: serialRow?.serialNumber },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      visit: visitRow,
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        nameEn: patient.nameEn,
        nameBn: patient.nameBn,
        phone: patient.phone,
      },
      tokenSlip: {
        tokenNumber,
        serialNumber: serialRow?.serialNumber ?? null,
        date: today,
        time: now,
        clinicNameBn: 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর',
        clinicNameEn: 'HPC Health & Pain Care Center, Jashore',
      },
    };
  }

  async getTodayVisits() {
    const today = todayDateString();
    const rows = await this.db
      .select({
        visit: visits,
        patient: patients,
        doctor: staff,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(staff, eq(visits.doctorId, staff.id))
      .where(eq(visits.visitDate, today))
      .orderBy(desc(visits.createdAt));

    return rows.map((r) => ({
      ...r.visit,
      patient: {
        id: r.patient.id,
        mrn: r.patient.mrn,
        nameEn: r.patient.nameEn,
        nameBn: r.patient.nameBn,
        phone: r.patient.phone,
        bloodGroup: r.patient.bloodGroup,
        allergies: r.patient.allergies,
      },
      doctor: r.doctor ? { id: r.doctor.id, fullName: r.doctor.fullName } : null,
    }));
  }

  async getDoctorQueue(doctorId: string) {
    const today = todayDateString();
    const rows = await this.db
      .select({
        serial: serials,
        patient: patients,
        visit: visits,
      })
      .from(serials)
      .innerJoin(patients, eq(serials.patientId, patients.id))
      .innerJoin(visits, eq(serials.visitId, visits.id))
      .where(and(eq(serials.doctorId, doctorId), eq(serials.date, today)))
      .orderBy(serials.serialNumber);

    return rows.map((r) => ({
      ...r.serial,
      patient: {
        id: r.patient.id,
        mrn: r.patient.mrn,
        nameEn: r.patient.nameEn,
        nameBn: r.patient.nameBn,
        phone: r.patient.phone,
        ageYears: r.patient.ageYears,
        gender: r.patient.gender,
      },
      priority: r.visit.priority,
    }));
  }

  async callNext(doctorId: string, serialId?: string, dto?: CallSerialDto) {
    return this.callSerial(doctorId, serialId, dto);
  }

  async callSerial(doctorId: string, serialId?: string, dto?: CallSerialDto) {
    const today = todayDateString();
    let targetSerial;

    if (serialId) {
      const rows = await this.db
        .select()
        .from(serials)
        .where(eq(serials.id, serialId));
      targetSerial = rows[0];
    } else {
      const rows = await this.db
        .select()
        .from(serials)
        .where(and(eq(serials.doctorId, doctorId), eq(serials.date, today), eq(serials.status, 'waiting')))
        .orderBy(serials.serialNumber)
        .limit(1);
      targetSerial = rows[0];
    }

    if (!targetSerial) {
      throw new NotFoundException('No waiting patients in queue');
    }

    const now = new Date().toISOString();
    await this.db
      .update(serials)
      .set({ status: 'called', calledAt: now, updatedAt: now })
      .where(eq(serials.id, targetSerial.id));

    await this.db
      .update(visits)
      .set({ status: 'in_consult', currentLocation: 'chamber', updatedAt: now })
      .where(eq(visits.id, targetSerial.visitId));

    const patientRows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, targetSerial.patientId));
    const patient = patientRows[0];

    const effectiveDoctorId = doctorId || targetSerial.doctorId;

    const doctorRows = await this.db
      .select()
      .from(staff)
      .where(eq(staff.id, effectiveDoctorId));
    const doctor = doctorRows[0];

    const payload = {
      serialId: targetSerial.id,
      serialNumber: targetSerial.serialNumber,
      doctorId: effectiveDoctorId,
      doctorName: doctor?.fullName ?? 'Doctor',
      patientId: targetSerial.patientId,
      patientMrn: patient?.mrn,
      patientName: patient?.nameEn,
      chamberCode: dto?.chamberCode ?? 'Chamber 1',
      calledAt: now,
    };

    this.gateway.emit('clinic:global', 'serial.called', payload);
    this.gateway.emit(`doctor:${effectiveDoctorId}`, 'serial.called', payload);
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: effectiveDoctorId });
    this.realtime.publish('serial.called', payload);
    this.realtime.publish('queue.updated', { doctorId: effectiveDoctorId });

    return { ok: true, serial: targetSerial, payload };
  }

  async completeSerial(serialId: string) {
    const rows = await this.db
      .select()
      .from(serials)
      .where(eq(serials.id, serialId));
    const serial = rows[0];
    if (!serial) throw new NotFoundException('Serial not found');

    const now = new Date().toISOString();
    await this.db
      .update(serials)
      .set({ status: 'completed', completedAt: now, updatedAt: now })
      .where(eq(serials.id, serialId));

    this.gateway.emit('clinic:global', 'serial.completed', { serialId, doctorId: serial.doctorId });
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: serial.doctorId });
    this.realtime.publish('serial.completed', { serialId, doctorId: serial.doctorId });
    this.realtime.publish('queue.updated', { doctorId: serial.doctorId });

    return { ok: true, completedAt: now };
  }

  async skipSerial(serialId: string) {
    const rows = await this.db
      .select()
      .from(serials)
      .where(eq(serials.id, serialId));
    const serial = rows[0];
    if (!serial) throw new NotFoundException('Serial not found');

    const now = new Date().toISOString();
    await this.db
      .update(serials)
      .set({ status: 'skipped', updatedAt: now })
      .where(eq(serials.id, serialId));

    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: serial.doctorId });
    this.realtime.publish('queue.updated', { doctorId: serial.doctorId });

    return { ok: true, status: 'skipped' };
  }

  async routePatient(visitId: string, dto: RoutePatientDto) {
    const rows = await this.db
      .select()
      .from(visits)
      .where(eq(visits.id, visitId));
    const visit = rows[0];
    if (!visit) throw new NotFoundException('Visit not found');

    const now = new Date().toISOString();
    let newStatus = visit.status;
    if (dto.location === 'therapy') newStatus = 'in_therapy';
    else if (dto.location === 'cashier') newStatus = 'billed';
    else if (dto.location === 'exit') newStatus = 'checked_out';

    await this.db
      .update(visits)
      .set({
        currentLocation: dto.location,
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    const payload = {
      visitId,
      patientId: visit.patientId,
      previousLocation: visit.currentLocation,
      currentLocation: dto.location,
      status: newStatus,
      targetId: dto.targetId ?? null,
    };

    this.gateway.emit('clinic:global', 'patient.routed', payload);
    this.realtime.publish('patient.routed', payload);

    return { ok: true, ...payload };
  }

  async checkOut(visitId: string, _dto: CheckOutDto) {
    const rows = await this.db
      .select()
      .from(visits)
      .where(eq(visits.id, visitId));
    const visit = rows[0];
    if (!visit) throw new NotFoundException('Visit not found');

    // Verify billing status: cannot check out if unsettled bills exist
    const patientBills = await this.db
      .select()
      .from(bills)
      .where(and(eq(bills.visitId, visitId), eq(bills.status, 'draft')));
    if (patientBills.length > 0) {
      throw new BadRequestException('Cannot check out: Visit has draft unsettled bills');
    }

    const now = new Date().toISOString();
    await this.db
      .update(visits)
      .set({
        status: 'checked_out',
        currentLocation: 'exit',
        checkedOutAt: now,
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    this.gateway.emit('clinic:global', 'visit.checked_out', { visitId, patientId: visit.patientId });
    this.realtime.publish('visit.checked_out', { visitId, patientId: visit.patientId });

    return { ok: true, checkedOutAt: now };
  }

  async getTvSnapshot() {
    const today = todayDateString();
    const activeDoctors = await this.db
      .select()
      .from(staff)
      .where(
        and(
          or(eq(staff.role, 'doctor'), eq(staff.role, 'head_doctor')),
          eq(staff.isActive, 1),
        ),
      );

    const snapshot = [];
    for (const doc of activeDoctors) {
      const currentCalled = await this.db
        .select({
          serial: serials,
          patient: patients,
        })
        .from(serials)
        .innerJoin(patients, eq(serials.patientId, patients.id))
        .where(and(eq(serials.doctorId, doc.id), eq(serials.date, today), eq(serials.status, 'called')))
        .orderBy(desc(serials.calledAt))
        .limit(1);

      const nextWaiting = await this.db
        .select({
          serial: serials,
          patient: patients,
        })
        .from(serials)
        .innerJoin(patients, eq(serials.patientId, patients.id))
        .where(and(eq(serials.doctorId, doc.id), eq(serials.date, today), eq(serials.status, 'waiting')))
        .orderBy(serials.serialNumber)
        .limit(5);

      snapshot.push({
        doctor: {
          id: doc.id,
          nameEn: doc.fullName,
          specialization: doc.specialization,
        },
        nowServing: currentCalled[0]
          ? {
              serialNumber: currentCalled[0].serial.serialNumber,
              patientName: currentCalled[0].patient.nameEn,
              calledAt: currentCalled[0].serial.calledAt,
            }
          : null,
        nextQueue: nextWaiting.map((w) => ({
          serialNumber: w.serial.serialNumber,
          patientName: w.patient.nameEn,
        })),
      });
    }

    // Consultation Queue aggregate
    const nowServingConsultation = await this.db
      .select({
        serialNumber: serials.serialNumber,
        tokenNumber: visits.tokenNumber,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        doctorId: staff.id,
        doctorNameEn: staff.fullName,
        doctorSpecialization: staff.specialization,
        calledAt: serials.calledAt,
        status: serials.status,
      })
      .from(serials)
      .innerJoin(patients, eq(serials.patientId, patients.id))
      .innerJoin(staff, eq(serials.doctorId, staff.id))
      .innerJoin(visits, eq(serials.visitId, visits.id))
      .where(
        and(
          eq(serials.date, today),
          or(eq(serials.status, 'called'), eq(serials.status, 'in_chamber')),
        ),
      )
      .orderBy(desc(serials.calledAt));

    const waitingConsultation = await this.db
      .select({
        serialNumber: serials.serialNumber,
        tokenNumber: visits.tokenNumber,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        doctorNameEn: staff.fullName,
        priority: visits.priority,
      })
      .from(serials)
      .innerJoin(patients, eq(serials.patientId, patients.id))
      .innerJoin(staff, eq(serials.doctorId, staff.id))
      .innerJoin(visits, eq(serials.visitId, visits.id))
      .where(and(eq(serials.date, today), eq(serials.status, 'waiting')))
      .orderBy(serials.serialNumber)
      .limit(10);

    // Therapy Queue aggregate
    const activeTherapies = await this.db
      .select({
        sessionId: therapySessions.id,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        modalityCode: therapySessions.modalityCode,
        modalityNameEn: modalities.nameEn,
        modalityNameBn: modalities.nameBn,
        bedName: beds.name,
        startedAt: therapySessions.startedAt,
        durationMinutes: therapySessions.durationMinutes,
      })
      .from(therapySessions)
      .innerJoin(patients, eq(therapySessions.patientId, patients.id))
      .leftJoin(modalities, eq(therapySessions.modalityCode, modalities.code))
      .leftJoin(beds, eq(therapySessions.bedId, beds.id))
      .where(eq(therapySessions.status, 'in_progress'))
      .limit(8);

    const waitingTherapies = await this.db
      .select({
        visitId: visits.id,
        tokenNumber: visits.tokenNumber,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        priority: visits.priority,
        currentLocation: visits.currentLocation,
        checkedInAt: visits.checkedInAt,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(
        and(
          eq(visits.visitDate, today),
          or(
            and(eq(visits.status, 'checked_in'), eq(visits.currentLocation, 'therapy_hall')),
            eq(visits.status, 'in_therapy'),
          ),
        ),
      )
      .orderBy(visits.tokenNumber)
      .limit(10);

    return {
      date: today,
      clinicName: 'Health & Pain Care Center · Jashore',
      clinicNameBn: 'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার · যশোর',
      chiefDoctor: 'ডাঃ মোঃ তৌফিক উজ জামান (BPT, PGD, MDMR, MPH)',
      timestamp: new Date().toISOString(),
      channels: snapshot,
      consultationQueue: {
        nowServing: nowServingConsultation,
        waiting: waitingConsultation,
      },
      therapyQueue: {
        nowServing: activeTherapies,
        waiting: waitingTherapies,
      },
      bulletinNotices: [
        'স্বাগতম: হেলথ অ্যান্ড পেইন কেয়ার সেন্টার (HPC) · যশোর | আধুনিক ফিজিওথেরাপি ও পুনর্বাসন কেন্দ্র',
        'Welcome to HPC Jashore | Please monitor your token number on the screen',
        'চিফ কনসালট্যান্ট: ডাঃ মোঃ তৌফিক উজ জামান | পরামর্শের জন্য সিরিয়াল অনুযায়ী অপেক্ষা করুন',
        'থেরাপি চলাকালীন মোবাইল ফোন সাইলেন্ট রাখুন | Please silence your mobile phones in the therapy hall',
        'জরুরি যোগাযোগ ও হটলাইন: 01711-000000 | নামাজের বিরতি: দুপুর ১:১৫ হতে ১:৪৫ পর্যন্ত',
      ],
    };
  }
}
