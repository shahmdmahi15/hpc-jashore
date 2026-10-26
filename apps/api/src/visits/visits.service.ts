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
  bills,
  consultationBookings,
  consultations,
  dues,
  modalities,
  packageCredits,
  packages,
  patientIntakeForms,
  patients,
  patientTimelineEvents,
  prescriptions,
  rooms,
  sequences,
  serials,
  therapySessions,
  therapySlotBookings,
  users,
  visits,
  type PunctualityStatus,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  CallSerialDto,
  CheckInDto,
  CheckOutDto,
  RoutePatientDto,
  SendToDoctorQueueDto,
} from './dto';

const todayDateString = () => new Date().toISOString().slice(0, 10);

/**
 * Parse told time string (e.g. "09:30 AM", "14:15", "10:00", "2:30 PM") into minutes from midnight.
 */
export function parseToldTimeToMinutes(toldTimeStr?: string | null): number | null {
  if (!toldTimeStr || !toldTimeStr.trim()) return null;
  const match = toldTimeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Calculate punctuality status & delay in minutes:
 * User requirement:
 * - Up to 5 min late: Green ('on_time')
 * - 5 min to 15 min late: Yellow ('moderate_delay')
 * - > 15 min late: Red ('critical_delay')
 */
export function computePunctuality(
  toldTimeStr?: string | null,
  checkInDate: Date = new Date(),
): { punctualityStatus: PunctualityStatus; delayMinutes: number } | null {
  const toldMinutes = parseToldTimeToMinutes(toldTimeStr);
  if (toldMinutes === null) return null;

  const currentMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  const delayMinutes = currentMinutes - toldMinutes;

  if (delayMinutes <= 5) {
    return {
      punctualityStatus: 'on_time',
      delayMinutes,
    };
  } else if (delayMinutes <= 15) {
    return {
      punctualityStatus: 'moderate_delay',
      delayMinutes,
    };
  } else {
    return {
      punctualityStatus: 'critical_delay',
      delayMinutes,
    };
  }
}

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
    const today = todayDateString();
    const now = new Date().toISOString();

    // Strict requirement: When a patient is already checked in, they cannot be re-checked in until checkout!
    const activeVisit = await this.db
      .select()
      .from(visits)
      .where(
        and(
          eq(visits.patientId, patient.id),
          eq(visits.visitDate, today),
          sql`${visits.status} NOT IN ('checked_out', 'completed', 'cancelled')`,
        ),
      )
      .limit(1);

    if (activeVisit.length > 0) {
      throw new BadRequestException(
        `এই রোগী ইতিমধ্যে আজ চেক-ইন আছেন (টোকেন #${activeVisit[0].tokenNumber})। পুনরায় চেক-ইন করার পূর্বে আগের ভিজিটটি চেক-আউট সম্পন্ন করতে হবে। (Patient is already checked in with Token #${activeVisit[0].tokenNumber}. Must checkout before re-checking in.)`,
      );
    }

    const tokenNumber = await this.nextTokenNumber(year);

    // Find if there is an active therapy slot booking for this patient today
    let activeBooking = null;
    if (dto.therapyBookingId) {
      const bRows = await this.db
        .select()
        .from(therapySlotBookings)
        .where(
          and(
            eq(therapySlotBookings.id, dto.therapyBookingId),
            isNull(therapySlotBookings.deletedAt),
            sql`${therapySlotBookings.status} NOT IN ('cancelled', 'attended')`,
          ),
        );
      activeBooking = bRows[0] ?? null;
    } else {
      const bRows = await this.db
        .select()
        .from(therapySlotBookings)
        .where(
          and(
            eq(therapySlotBookings.patientId, patient.id),
            eq(therapySlotBookings.bookingDate, today),
            sql`${therapySlotBookings.status} NOT IN ('cancelled')`,
            isNull(therapySlotBookings.deletedAt),
          ),
        )
        .limit(1);
      activeBooking = bRows[0] ?? null;
    }

    if (activeBooking && activeBooking.capacityType === 'extra') {
      if (activeBooking.approvalStatus === 'pending') {
        throw new BadRequestException(
          'This extra standby slot is pending doctor or admin approval before check-in can proceed.',
        );
      }
      if (activeBooking.approvalStatus === 'rejected') {
        throw new BadRequestException(
          `This extra standby slot was rejected by doctor/admin${activeBooking.rejectionReason ? `: ${activeBooking.rejectionReason}` : ''}. Check-in cannot proceed.`,
        );
      }
    }

    // Look up active consultation booking if applicable (for reference only, NEVER for auto-queueing to consultation queue)
    let activeDocBooking: any = null;
    if (dto.consultationBookingId) {
      const docBookings = await this.db
        .select()
        .from(consultationBookings)
        .where(
          and(
            eq(consultationBookings.id, dto.consultationBookingId),
            isNull(consultationBookings.deletedAt),
            sql`${consultationBookings.status} != 'cancelled'`,
          ),
        );
      activeDocBooking = docBookings[0] ?? null;
    } else {
      const docBookings = await this.db
        .select()
        .from(consultationBookings)
        .where(
          and(
            eq(consultationBookings.patientId, patient.id),
            eq(consultationBookings.bookingDate, today),
            dto.doctorId ? eq(consultationBookings.doctorId, dto.doctorId) : sql`1=1`,
            sql`${consultationBookings.status} IN ('booked', 'confirmed')`,
            isNull(consultationBookings.deletedAt),
          ),
        )
        .limit(1);
      activeDocBooking = docBookings[0] ?? null;
    }

    // STRICT USER DIRECTIVES:
    // 1. If patient has a therapy slot -> automatically put him in therapy queue (destination = 'therapy', visits.therapyBookingId set).
    // 2. If patient has NO therapy slot -> DO NOT put him in therapy queue, even if he has consultation serial.
    // 3. If patient has consultation serial and no therapy slot -> DO NOT put him to consultation queue!
    // 4. During check-in, under no circumstances is any patient auto-queued into the doctor consultation queue.
    const hasTherapySlot = Boolean(activeBooking);
    const destination = hasTherapySlot ? 'therapy' : 'waiting_room';

    const effectiveToldTime =
      dto.toldTime?.trim() ||
      activeBooking?.toldTime?.trim() ||
      (hasTherapySlot ? null : (activeDocBooking?.toldTime?.trim() || activeDocBooking?.slotTime?.trim())) ||
      null;
    const punctuality = effectiveToldTime ? computePunctuality(effectiveToldTime, new Date()) : null;

    // Put patient into the first active waiting room found in room config
    const waitingRoomRows = await this.db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.type, 'waiting_room'),
          eq(rooms.isActive, 1),
          sql`${rooms.status} != 'not_allowed'`,
          isNull(rooms.deletedAt),
        ),
      )
      .orderBy(sql`CAST(${rooms.roomNumber} AS INTEGER) ASC`, rooms.roomNumber)
      .limit(1);

    const firstWaitingRoom = waitingRoomRows[0] ?? null;
    const initialLocation = hasTherapySlot ? 'therapy_hall' : (firstWaitingRoom?.name || 'Waiting Room');
    const roomId = hasTherapySlot ? null : (firstWaitingRoom?.id ?? null);

    const assignedDoctorId = activeDocBooking?.doctorId ?? dto.doctorId ?? null;

    const visitId = randomUUID();
    const visitRow = {
      id: visitId,
      patientId: patient.id,
      doctorId: assignedDoctorId,
      tokenNumber,
      visitDate: today,
      status: 'checked_in' as const,
      priority: dto.priority ?? ('normal' as const),
      currentLocation: initialLocation,
      roomId,
      checkedInAt: now,
      checkedOutAt: null,
      toldTime: effectiveToldTime,
      punctualityStatus: punctuality?.punctualityStatus ?? null,
      delayMinutes: punctuality?.delayMinutes ?? null,
      therapyBookingId: activeBooking ? activeBooking.id : null,
      consultationBookingId: activeDocBooking ? activeDocBooking.id : null,
      notes: dto.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(visits).values(visitRow);

    // If active therapy booking exists, update it to attended with punctuality
    if (activeBooking) {
      await this.db
        .update(therapySlotBookings)
        .set({
          status: 'attended',
          checkedInAt: now,
          punctualityStatus: punctuality?.punctualityStatus ?? null,
          delayMinutes: punctuality?.delayMinutes ?? null,
          updatedAt: now,
        })
        .where(eq(therapySlotBookings.id, activeBooking.id));
    }

    // If active consultation booking exists, update it to checked_in with punctuality
    if (activeDocBooking) {
      await this.db
        .update(consultationBookings)
        .set({
          status: 'checked_in',
          checkedInAt: now,
          punctualityStatus: punctuality?.punctualityStatus ?? null,
          delayMinutes: punctuality?.delayMinutes ?? null,
          visitId,
          updatedAt: now,
        })
        .where(eq(consultationBookings.id, activeDocBooking.id));
    }

    // Decrement per_day package credit if active and not already visited today
    try {
      const activeCredits = await this.db
        .select({
          credit: packageCredits,
          pkg: packages,
        })
        .from(packageCredits)
        .innerJoin(packages, eq(packageCredits.packageId, packages.id))
        .where(and(eq(packageCredits.patientId, patient.id), eq(packageCredits.status, 'active')))
        .orderBy(desc(packageCredits.createdAt))
        .limit(1);

      if (activeCredits[0]) {
        const { credit, pkg } = activeCredits[0];
        if (pkg.packageType === 'per_day') {
          const todayDhaka = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
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
    } catch (creditErr) {
      console.error('Error processing package credit on checkIn:', creditErr);
    }

    // CRITICAL USER DIRECTIVE: Consultation patients do NOT automatically go into serials queue!
    // They are checked-in in the waiting room.
    // Someone (cashier, receptionist, admin) manually sends them to the doctor queue (e.g. after fee collection).
    const serialRow: { serialNumber?: number } | null = null;

    // Broadcast realtime event
    const eventPayload = {
      visitId,
      patientId: patient.id,
      mrn: patient.mrn,
      patientName: patient.nameEn,
      tokenNumber,
      destination,
      currentLocation: initialLocation,
      roomId,
      doctorId: assignedDoctorId,
      serialNumber: null,
      toldTime: effectiveToldTime,
      punctualityStatus: punctuality?.punctualityStatus ?? null,
      delayMinutes: punctuality?.delayMinutes ?? null,
      hasTherapySlot,
    };
    this.gateway.emit('clinic:global', 'visit.checked_in', eventPayload);
    this.realtime.publish('visit.checked_in', eventPayload);

    if (hasTherapySlot && activeBooking) {
      this.gateway.emit('clinic:global', 'therapy.queue.updated', eventPayload);
      this.gateway.emit('clinic:global', 'therapy.slot.updated', { bookingId: activeBooking.id, status: 'attended' });
      this.realtime.publish('therapy.queue.updated', eventPayload);
      this.realtime.publish('therapy.slot.updated', { bookingId: activeBooking.id, status: 'attended' });
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'visit.check_in',
      entity: 'visits',
      entityId: visitId,
      after: { ...visitRow, serialNumber: null },
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
        serialNumber: null,
        date: today,
        time: now,
        destination,
        toldTime: effectiveToldTime,
        punctualityStatus: punctuality?.punctualityStatus ?? null,
        delayMinutes: punctuality?.delayMinutes ?? null,
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
        doctor: users,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(users, eq(visits.doctorId, users.id))
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
      doctor: r.doctor ? { id: r.doctor.id, fullName: r.doctor.displayName } : null,
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
    return this.callSerial(doctorId, serialId, dto, false);
  }

  async recallSerial(doctorId: string, serialId: string, dto?: CallSerialDto) {
    return this.callSerial(doctorId, serialId, dto, true);
  }

  async callSerial(doctorId: string, serialId?: string, dto?: CallSerialDto, isRecall = false) {
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

    const visitRows = await this.db
      .select()
      .from(visits)
      .where(eq(visits.id, targetSerial.visitId));
    const visit = visitRows[0];

    if (visit?.consultationBookingId) {
      await this.db
        .update(consultationBookings)
        .set({ status: 'calling', updatedAt: now })
        .where(eq(consultationBookings.id, visit.consultationBookingId));
    }

    const patientRows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, targetSerial.patientId));
    const patient = patientRows[0];

    const effectiveDoctorId = doctorId || targetSerial.doctorId;

    const doctorRows = await this.db
      .select({
        user: users,
        chamber: rooms,
      })
      .from(users)
      .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
      .where(eq(users.id, effectiveDoctorId));
    const doctorItem = doctorRows[0];

    const doctorName = doctorItem?.user?.displayName || 'Doctor';
    const chamberNumber = doctorItem?.chamber?.roomNumber || '101';
    const chamberName = doctorItem?.chamber?.name || `Chamber ${chamberNumber}`;
    const tokenNumber = visit?.tokenNumber || targetSerial.serialNumber;

    const payload = {
      serialId: targetSerial.id,
      serialNumber: targetSerial.serialNumber,
      tokenNumber,
      doctorId: effectiveDoctorId,
      doctorName,
      doctorNameEn: doctorName,
      doctorNameBn: doctorName,
      patientId: targetSerial.patientId,
      patientMrn: patient?.mrn || '',
      patientName: patient?.nameEn || 'Patient',
      patientNameEn: patient?.nameEn || 'Patient',
      patientNameBn: patient?.nameBn || patient?.nameEn || 'রোগী',
      chamberRoomNumber: chamberNumber,
      chamberCode: dto?.chamberCode || `Chamber ${chamberNumber}`,
      chamberName,
      calledAt: now,
      isRecall: Boolean(isRecall),
    };

    // Broadcast realtime event
    this.gateway.emit('clinic:global', 'consultation.call_chamber', payload);
    this.gateway.emit('clinic:global', 'serial.called', payload);
    this.gateway.emit(`doctor:${effectiveDoctorId}`, 'serial.called', payload);
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: effectiveDoctorId });
    this.realtime.publish('consultation.call_chamber', payload);
    this.realtime.publish('serial.called', payload);
    this.realtime.publish('queue.updated', { doctorId: effectiveDoctorId });

    // Log Timeline Event
    try {
      await this.db.insert(patientTimelineEvents).values({
        id: randomUUID(),
        patientId: targetSerial.patientId,
        visitId: targetSerial.visitId,
        step: isRecall ? 'recalled' : 'called_chamber',
        titleEn: isRecall ? 'Recalled to Chamber' : 'Called to Chamber',
        titleBn: isRecall ? 'পুনরায় চেম্বারে ডাকা হয়েছে (Recall)' : 'চেম্বারে ডাকা হয়েছে',
        descriptionEn: `Dr. ${doctorName} called patient to Room ${chamberNumber}`,
        descriptionBn: `ডাঃ ${doctorName} রোগী ${payload.patientNameBn}-কে রুম নম্বর ${chamberNumber}-এ ডাকছেন।`,
        metadataJson: JSON.stringify(payload),
        occurredAt: now,
        date: today,
      });
    } catch (e) {
      console.warn('Timeline log error:', e);
    }

    return { ok: true, serial: targetSerial, payload };
  }

  async markInConsultation(serialId: string) {
    const rows = await this.db
      .select({
        serial: serials,
        patient: patients,
        doctor: users,
        visit: visits,
      })
      .from(serials)
      .innerJoin(patients, eq(serials.patientId, patients.id))
      .leftJoin(users, eq(serials.doctorId, users.id))
      .leftJoin(visits, eq(serials.visitId, visits.id))
      .where(eq(serials.id, serialId));

    const item = rows[0];
    if (!item) throw new NotFoundException('Serial not found');

    const now = new Date().toISOString();
    const today = item.serial.date || todayDateString();

    await this.db
      .update(serials)
      .set({ status: 'in_chamber', updatedAt: now })
      .where(eq(serials.id, serialId));

    await this.db
      .update(visits)
      .set({ status: 'in_consult', currentLocation: 'Chamber Room', updatedAt: now })
      .where(eq(visits.id, item.serial.visitId));

    if (item.visit?.consultationBookingId) {
      await this.db
        .update(consultationBookings)
        .set({ status: 'in_consultation', updatedAt: now })
        .where(eq(consultationBookings.id, item.visit.consultationBookingId));
    }

    await this.db
      .update(patientIntakeForms)
      .set({ status: 'in_consultation', updatedAt: now })
      .where(eq(patientIntakeForms.visitId, item.serial.visitId));

    const doctorName = item.doctor?.displayName || 'Doctor';

    // Log timeline event
    try {
      await this.db.insert(patientTimelineEvents).values({
        id: randomUUID(),
        patientId: item.serial.patientId,
        visitId: item.serial.visitId,
        step: 'in_consultation',
        titleEn: 'In Consultation',
        titleBn: 'পরামর্শ শুরু (In Consultation)',
        descriptionEn: `Patient arrived in chamber; consultation in progress with Dr. ${doctorName}`,
        descriptionBn: `রোগী চেম্বারে উপস্থিত হয়েছেন এবং ডাঃ ${doctorName}-এর সাথে পরামর্শ শুরু হয়েছে।`,
        occurredAt: now,
        date: today,
      });
    } catch (e) {
      console.warn('Timeline log error:', e);
    }

    const payload = {
      serialId,
      status: 'in_chamber',
      doctorId: item.serial.doctorId,
      patientId: item.serial.patientId,
    };

    this.gateway.emit('clinic:global', 'consultation.in_chamber', payload);
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: item.serial.doctorId });
    this.realtime.publish('consultation.in_chamber', payload);
    this.realtime.publish('queue.updated', { doctorId: item.serial.doctorId });

    return { ok: true, status: 'in_chamber', serialId };
  }

  async cancelCall(serialId: string) {
    const rows = await this.db
      .select({
        serial: serials,
        patient: patients,
        doctor: users,
        visit: visits,
      })
      .from(serials)
      .innerJoin(patients, eq(serials.patientId, patients.id))
      .leftJoin(users, eq(serials.doctorId, users.id))
      .leftJoin(visits, eq(serials.visitId, visits.id))
      .where(eq(serials.id, serialId));

    const item = rows[0];
    if (!item) throw new NotFoundException('Serial not found');

    const now = new Date().toISOString();
    const today = item.serial.date || todayDateString();

    await this.db
      .update(serials)
      .set({ status: 'waiting', calledAt: null, updatedAt: now })
      .where(eq(serials.id, serialId));

    await this.db
      .update(visits)
      .set({ status: 'checked_in', currentLocation: 'Waiting Room', updatedAt: now })
      .where(eq(visits.id, item.serial.visitId));

    if (item.visit?.consultationBookingId) {
      await this.db
        .update(consultationBookings)
        .set({ status: 'in_queue', updatedAt: now })
        .where(eq(consultationBookings.id, item.visit.consultationBookingId));
    }

    await this.db
      .update(patientIntakeForms)
      .set({ status: 'in_queue', updatedAt: now })
      .where(eq(patientIntakeForms.visitId, item.serial.visitId));

    // Log timeline event
    try {
      await this.db.insert(patientTimelineEvents).values({
        id: randomUUID(),
        patientId: item.serial.patientId,
        visitId: item.serial.visitId,
        step: 'call_cancelled',
        titleEn: 'Call Cancelled',
        titleBn: 'কল বাতিল (অপেক্ষমাণ তালিকায় রাখা হলো)',
        descriptionEn: 'Doctor cancelled the call; patient kept in consultation waiting queue',
        descriptionBn: 'ডাক্তার কর্তৃক কল বাতিল করা হয়েছে, রোগী পুনরায় অপেক্ষমাণ কিউতে আছেন।',
        occurredAt: now,
        date: today,
      });
    } catch (e) {
      console.warn('Timeline log error:', e);
    }

    const payload = {
      serialId,
      status: 'waiting',
      doctorId: item.serial.doctorId,
      patientId: item.serial.patientId,
    };

    this.gateway.emit('clinic:global', 'consultation.call_cancelled', payload);
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: item.serial.doctorId });
    this.realtime.publish('consultation.call_cancelled', payload);
    this.realtime.publish('queue.updated', { doctorId: item.serial.doctorId });

    return { ok: true, status: 'waiting', serialId };
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

  async getCheckoutActiveVisits(search?: string, statusFilter?: string) {
    const today = todayDateString();

    const visitRows = await this.db
      .select({
        visit: visits,
        patient: patients,
        doctor: users,
        chamber: rooms,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(users, eq(visits.doctorId, users.id))
      .leftJoin(rooms, eq(visits.roomId, rooms.id))
      .where(
        and(
          eq(visits.visitDate, today),
          sql`${visits.status} != 'cancelled'`,
        ),
      )
      .orderBy(desc(visits.createdAt));

    const visitIds = visitRows.map((r) => r.visit.id);

    const allBills = visitIds.length > 0
      ? await this.db.select().from(bills).where(sql`${bills.visitId} IN ${visitIds}`)
      : [];

    const allPrescriptions = visitIds.length > 0
      ? await this.db.select().from(prescriptions).where(sql`${prescriptions.visitId} IN ${visitIds}`)
      : [];

    const allConsultations = visitIds.length > 0
      ? await this.db.select().from(consultations).where(sql`${consultations.visitId} IN ${visitIds}`)
      : [];

    const patientIds = Array.from(new Set(visitRows.map((r) => r.patient.id)));
    const allSessions = patientIds.length > 0
      ? await this.db.select().from(therapySessions).where(sql`${therapySessions.patientId} IN ${patientIds}`)
      : [];

    const items = visitRows.map((row) => {
      const vBills = allBills.filter((b) => b.visitId === row.visit.id && b.status !== 'voided');
      const totalPaisa = vBills.reduce((acc, b) => acc + (b.totalPaisa || 0), 0);
      const paidPaisa = vBills.reduce((acc, b) => acc + (b.paidPaisa || 0), 0);
      const duePaisa = vBills.reduce((acc, b) => acc + (b.duePaisa || 0), 0);
      const hasDraftBills = vBills.some((b) => b.status === 'draft');

      const vPrescriptions = allPrescriptions.filter((p) => p.visitId === row.visit.id);
      const vConsultation = allConsultations.find((c) => c.visitId === row.visit.id);
      const vSessions = allSessions.filter((s) => s.patientId === row.patient.id);

      const isConsultationDone = row.visit.status === 'in_consult' ? false : Boolean(vConsultation || vPrescriptions.length > 0 || !row.visit.doctorId);
      const isTherapyDone = row.visit.status === 'in_therapy' ? false : Boolean(vSessions.length > 0 || !row.visit.therapyBookingId);

      let readiness: 'ready' | 'pending_dues' | 'in_service' | 'checked_out';
      if (row.visit.status === 'checked_out') {
        readiness = 'checked_out';
      } else if (row.visit.status === 'in_consult' || row.visit.status === 'in_therapy') {
        readiness = 'in_service';
      } else if (duePaisa > 0 || hasDraftBills) {
        readiness = 'pending_dues';
      } else {
        readiness = 'ready';
      }

      return {
        visit: {
          id: row.visit.id,
          tokenNumber: row.visit.tokenNumber,
          visitDate: row.visit.visitDate,
          status: row.visit.status,
          priority: row.visit.priority,
          currentLocation: row.visit.currentLocation,
          checkedInAt: row.visit.checkedInAt,
          checkedOutAt: row.visit.checkedOutAt,
          toldTime: row.visit.toldTime,
          punctualityStatus: row.visit.punctualityStatus,
          delayMinutes: row.visit.delayMinutes,
          notes: row.visit.notes,
          dischargeNotes: row.visit.dischargeNotes,
          nextFollowUpDate: row.visit.nextFollowUpDate,
        },
        patient: {
          id: row.patient.id,
          mrn: row.patient.mrn,
          nameEn: row.patient.nameEn,
          nameBn: row.patient.nameBn,
          phone: row.patient.phone,
          gender: row.patient.gender,
          ageYears: row.patient.ageYears,
          bloodGroup: row.patient.bloodGroup,
        },
        doctor: row.doctor
          ? {
              id: row.doctor.id,
              fullName: row.doctor.displayName,
              specialization: row.doctor.specialization,
              chamber: row.chamber?.name || `Chamber ${row.chamber?.roomNumber || ''}`,
            }
          : null,
        financial: {
          totalBillTaka: Math.round(totalPaisa / 100),
          paidTaka: Math.round(paidPaisa / 100),
          dueTaka: Math.round(duePaisa / 100),
          hasDues: duePaisa > 0,
          hasDraftBills,
          billCount: vBills.length,
        },
        clinical: {
          isConsultationDone,
          isTherapyDone,
          prescriptionIssued: vPrescriptions.length > 0,
          prescriptionId: vPrescriptions[0]?.id ?? null,
          therapySessionsCount: vSessions.length,
          followUpDate: vConsultation?.followUpDate ?? row.visit.nextFollowUpDate ?? null,
        },
        readiness,
      };
    });

    let filtered = items;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.patient.nameEn.toLowerCase().includes(q) ||
          (i.patient.nameBn && i.patient.nameBn.toLowerCase().includes(q)) ||
          i.patient.mrn.toLowerCase().includes(q) ||
          (i.patient.phone && i.patient.phone.includes(q)) ||
          (i.doctor && i.doctor.fullName.toLowerCase().includes(q)),
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'ready') {
        filtered = filtered.filter((i) => i.readiness === 'ready');
      } else if (statusFilter === 'pending_dues') {
        filtered = filtered.filter((i) => i.readiness === 'pending_dues');
      } else if (statusFilter === 'in_service') {
        filtered = filtered.filter((i) => i.readiness === 'in_service');
      } else if (statusFilter === 'checked_out') {
        filtered = filtered.filter((i) => i.readiness === 'checked_out');
      } else if (statusFilter === 'active') {
        filtered = filtered.filter((i) => i.readiness !== 'checked_out');
      }
    }

    const stats = {
      totalCheckedInToday: items.length,
      currentlyInClinic: items.filter((i) => i.visit.status !== 'checked_out').length,
      readyForCheckout: items.filter((i) => i.readiness === 'ready').length,
      checkedOutToday: items.filter((i) => i.visit.status === 'checked_out').length,
      pendingDuesCount: items.filter((i) => i.readiness === 'pending_dues').length,
      totalDuesTaka: items.reduce((acc, i) => acc + (i.financial.dueTaka || 0), 0),
    };

    return { items: filtered, stats, date: today };
  }

  async checkOut(
    actor: { sub: string; role: string },
    visitId: string,
    dto: CheckOutDto,
    meta?: { ip?: string | null; requestId?: string | null },
  ) {
    const rows = await this.db
      .select({
        visit: visits,
        patient: patients,
        doctor: users,
        chamber: rooms,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(users, eq(visits.doctorId, users.id))
      .leftJoin(rooms, eq(visits.roomId, rooms.id))
      .where(eq(visits.id, visitId));
    const item = rows[0];
    if (!item) throw new NotFoundException('Visit not found');

    // Verify billing status
    const patientBills = await this.db
      .select()
      .from(bills)
      .where(and(eq(bills.visitId, visitId), eq(bills.status, 'draft')));

    if (patientBills.length > 0 && !dto.allowWithDues) {
      throw new BadRequestException(
        'Cannot check out: Visit has draft unsettled bills. Please settle bills or check "Allow with Dues".',
      );
    }

    const now = new Date().toISOString();
    await this.db
      .update(visits)
      .set({
        status: 'checked_out',
        currentLocation: 'exit',
        checkedOutAt: now,
        dischargeNotes: dto.notes ?? null,
        nextFollowUpDate: dto.nextFollowUpDate ?? null,
        clearedBy: actor.sub,
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    // If linked to consultationBookings, mark completed
    if (item.visit.consultationBookingId) {
      await this.db
        .update(consultationBookings)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(consultationBookings.id, item.visit.consultationBookingId));
    }

    // If linked to therapySlotBookings, mark completed
    if (item.visit.therapyBookingId) {
      await this.db
        .update(therapySlotBookings)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(therapySlotBookings.id, item.visit.therapyBookingId));
    }

    // Departure slip payload
    const departureSlip = await this.getDepartureSlip(visitId);

    this.gateway.emit('clinic:global', 'visit.checked_out', {
      visitId,
      patientId: item.patient.id,
      patientName: item.patient.nameEn,
      checkedOutAt: now,
    });
    this.realtime.publish('visit.checked_out', {
      visitId,
      patientId: item.patient.id,
      checkedOutAt: now,
    });

    if (meta) {
      await this.audit.log({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'visit.check_out',
        entity: 'visits',
        entityId: visitId,
        after: { visitId, checkedOutAt: now, notes: dto.notes },
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    return { ok: true, checkedOutAt: now, departureSlip };
  }

  async sendToDoctorQueue(
    actor: { sub: string; role: string },
    visitId: string,
    dto?: SendToDoctorQueueDto,
    meta?: { ip?: string | null; requestId?: string | null },
  ) {
    const rows = await this.db
      .select({
        visit: visits,
        patient: patients,
        doctor: users,
        chamber: rooms,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(users, eq(visits.doctorId, users.id))
      .leftJoin(rooms, eq(visits.roomId, rooms.id))
      .where(eq(visits.id, visitId));

    const item = rows[0];
    if (!item) throw new NotFoundException('Visit not found');
    const doctorId = item.visit.doctorId;
    if (!doctorId) {
      throw new BadRequestException('Cannot queue: No doctor assigned to this visit');
    }

    const today = item.visit.visitDate || todayDateString();
    const now = new Date().toISOString();

    // Check if already in queue
    const existingSerial = await this.db
      .select()
      .from(serials)
      .where(and(eq(serials.visitId, visitId), eq(serials.status, 'waiting')));

    if (existingSerial[0]) {
      return { ok: true, serial: existingSerial[0] };
    }

    const priorSerials = await this.db
      .select()
      .from(serials)
      .where(and(eq(serials.doctorId, doctorId), eq(serials.date, today)));

    const nextSerialNum = priorSerials.length + 1;
    const serialId = randomUUID();

    const serialRow = {
      id: serialId,
      doctorId,
      date: today,
      serialNumber: nextSerialNum,
      visitId,
      patientId: item.patient.id,
      status: 'waiting' as const,
      calledAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(serials).values(serialRow);

    // If linked to consultationBookings, update it
    if (item.visit.consultationBookingId) {
      await this.db
        .update(consultationBookings)
        .set({
          status: 'in_queue',
          serialNumber: nextSerialNum,
          serialId,
          inQueueAt: now,
          queuedBy: actor.sub,
          updatedAt: now,
        })
        .where(eq(consultationBookings.id, item.visit.consultationBookingId));
    }

    const eventPayload = {
      visitId,
      serialId,
      serialNumber: nextSerialNum,
      doctorId,
      doctorName: item.doctor?.displayName,
      chamber: item.chamber?.name,
      patientId: item.patient.id,
      patientName: item.patient.nameEn,
    };

    this.gateway.emit('clinic:global', 'consultation.queued', eventPayload);
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId });
    this.gateway.emit('clinic:global', 'doctor.queue.updated', eventPayload);
    this.realtime.publish('consultation.queued', eventPayload);

    if (meta) {
      await this.audit.log({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'consultation.queue_patient',
        entity: 'serials',
        entityId: serialId,
        after: eventPayload,
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    return { ok: true, serialNumber: nextSerialNum, serialId };
  }

  async getDepartureSlip(visitId: string) {
    const rows = await this.db
      .select({
        visit: visits,
        patient: patients,
        doctor: users,
        chamber: rooms,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(users, eq(visits.doctorId, users.id))
      .leftJoin(rooms, eq(visits.roomId, rooms.id))
      .where(eq(visits.id, visitId));

    const item = rows[0];
    if (!item) throw new NotFoundException('Visit not found');

    const vBills = await this.db
      .select()
      .from(bills)
      .where(and(eq(bills.visitId, visitId), sql`${bills.status} != 'voided'`));

    const totalPaisa = vBills.reduce((acc, b) => acc + (b.totalPaisa || 0), 0);
    const paidPaisa = vBills.reduce((acc, b) => acc + (b.paidPaisa || 0), 0);
    const duePaisa = vBills.reduce((acc, b) => acc + (b.duePaisa || 0), 0);

    const vPrescriptions = await this.db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.visitId, visitId));

    const vConsultation = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.visitId, visitId));

    return {
      clinic: {
        nameEn: 'HPC Health & Pain Care Center',
        nameBn: 'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার',
        address: 'Rail Road, Jashore, Bangladesh',
        hotline: '+880 1515-615188',
      },
      slipNumber: `OUT-${item.visit.visitDate.replace(/-/g, '')}-${item.visit.tokenNumber.toString().padStart(4, '0')}`,
      visitId: item.visit.id,
      tokenNumber: item.visit.tokenNumber,
      visitDate: item.visit.visitDate,
      entryTime: item.visit.checkedInAt,
      departureTime: item.visit.checkedOutAt || new Date().toISOString(),
      patient: {
        mrn: item.patient.mrn,
        nameEn: item.patient.nameEn,
        nameBn: item.patient.nameBn,
        phone: item.patient.phone,
        gender: item.patient.gender,
        ageYears: item.patient.ageYears,
      },
      doctor: item.doctor
        ? {
            name: item.doctor.displayName,
            specialization: item.doctor.specialization,
            chamber: item.chamber?.name,
          }
        : null,
      financial: {
        totalBillTaka: Math.round(totalPaisa / 100),
        paidTaka: Math.round(paidPaisa / 100),
        dueTaka: Math.round(duePaisa / 100),
        status: duePaisa > 0 ? 'Dues Outstanding' : 'Fully Settled',
      },
      nextFollowUpDate: item.visit.nextFollowUpDate || vConsultation[0]?.followUpDate || null,
      dischargeNotes: item.visit.dischargeNotes || item.visit.notes || null,
      prescriptionIssued: vPrescriptions.length > 0,
    };
  }

  async getTvSnapshot() {
    const today = todayDateString();
    const activeDoctors = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, 'doctor'),
          eq(users.isActive, 1),
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
          nameEn: doc.displayName,
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
        doctorId: users.id,
        doctorNameEn: users.displayName,
        doctorSpecialization: users.specialization,
        chamberRoomNumber: rooms.roomNumber,
        chamberName: rooms.name,
        calledAt: serials.calledAt,
        status: serials.status,
      })
      .from(serials)
      .innerJoin(patients, eq(serials.patientId, patients.id))
      .innerJoin(users, eq(serials.doctorId, users.id))
      .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
      .innerJoin(visits, eq(serials.visitId, visits.id))
      .where(
        and(
          eq(serials.date, today),
          eq(serials.status, 'called'),
        ),
      )
      .orderBy(desc(serials.calledAt));

    const waitingConsultation = await this.db
      .select({
        serialNumber: serials.serialNumber,
        tokenNumber: visits.tokenNumber,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        doctorNameEn: users.displayName,
        chamberRoomNumber: rooms.roomNumber,
        chamberName: rooms.name,
        priority: visits.priority,
      })
      .from(serials)
      .innerJoin(patients, eq(serials.patientId, patients.id))
      .innerJoin(users, eq(serials.doctorId, users.id))
      .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
      .innerJoin(visits, eq(serials.visitId, visits.id))
      .where(and(eq(serials.date, today), eq(serials.status, 'waiting')))
      .orderBy(serials.serialNumber)
      .limit(50);

    // Therapy Queue aggregate
    const activeTherapies = await this.db
      .select({
        sessionId: therapySessions.id,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        modalityCode: therapySessions.modalityCode,
        modalityNameEn: modalities.nameEn,
        modalityNameBn: modalities.nameBn,
        bedName: sql<string | null>`NULL`,
        roomName: sql<string>`'Therapy Hall'`,
        startedAt: therapySessions.startedAt,
        durationMinutes: therapySessions.durationMinutes,
      })
      .from(therapySessions)
      .innerJoin(patients, eq(therapySessions.patientId, patients.id))
      .leftJoin(modalities, eq(therapySessions.modalityCode, modalities.code))
      .where(eq(therapySessions.status, 'in_progress'))
      .limit(8);

    const callingTherapies = await this.db
      .select({
        visitId: visits.id,
        tokenNumber: visits.tokenNumber,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        roomNumber: rooms.roomNumber,
        roomName: rooms.name,
        updatedAt: visits.updatedAt,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(rooms, eq(visits.roomId, rooms.id))
      .where(
        and(
          eq(visits.visitDate, today),
          eq(visits.status, 'calling' as any),
        ),
      )
      .orderBy(desc(visits.updatedAt));

    const therapyNowServing = [
      ...callingTherapies.map((c) => ({
        sessionId: c.visitId,
        visitId: c.visitId,
        tokenNumber: c.tokenNumber,
        patientNameEn: c.patientNameEn,
        patientNameBn: c.patientNameBn || c.patientNameEn,
        modalityCode: 'PHYSIO',
        modalityNameEn: 'Physiotherapy & Rehab',
        modalityNameBn: 'ফিজিওথেরাপি ও পুনর্বাসন',
        bedName: c.roomName || (c.roomNumber ? `Room ${c.roomNumber}` : 'Therapy Hall'),
        roomName: c.roomName || (c.roomNumber ? `Room ${c.roomNumber}` : 'Therapy Hall'),
        startedAt: c.updatedAt,
        status: 'calling',
      })),
      ...activeTherapies,
    ];

    const waitingTherapies = await this.db
      .select({
        visitId: visits.id,
        tokenNumber: visits.tokenNumber,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        priority: visits.priority,
        currentLocation: visits.currentLocation,
        roomId: visits.roomId,
        checkedInAt: visits.checkedInAt,
        toldTime: visits.toldTime,
        punctualityStatus: visits.punctualityStatus,
        delayMinutes: visits.delayMinutes,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(
        and(
          eq(visits.visitDate, today),
          or(
            eq(visits.status, 'in_therapy'),
            and(
              sql`${visits.status} IN ('checked_in', 'waiting')`,
              or(
                and(
                  sql`${visits.therapyBookingId} IS NOT NULL`,
                  sql`${visits.therapyBookingId} NOT IN (SELECT id FROM therapy_slot_bookings WHERE status = 'cancelled' OR deleted_at IS NOT NULL)`,
                ),
                sql`${visits.currentLocation} IN ('therapy_hall', 'Therapy Hall')`,
                sql`${visits.patientId} IN (SELECT patient_id FROM therapy_slot_bookings WHERE booking_date = ${today} AND status NOT IN ('cancelled') AND deleted_at IS NULL)`,
              ),
            ),
          ),
        ),
      )
      .orderBy(visits.tokenNumber)
      .limit(30);

    return {
      date: today,
      clinicName: 'Health & Pain Care Center · Jashore',
      clinicNameBn: 'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার · যশোর',
      chiefDoctor: '',
      timestamp: new Date().toISOString(),
      channels: snapshot,
      consultationQueue: {
        nowServing: nowServingConsultation,
        waiting: waitingConsultation,
      },
      therapyQueue: {
        nowServing: therapyNowServing,
        waiting: waitingTherapies,
      },
      bulletinNotices: [
        'স্বাগতম: হেলথ অ্যান্ড পেইন কেয়ার সেন্টার (HPC) · যশোর | আধুনিক ফিজিওথেরাপি ও পুনর্বাসন কেন্দ্র',
        'Welcome to HPC Jashore | Please monitor your token number on the screen',
        'আধুনিক ফিজিওথেরাপি, পুনর্বাসন ও পেইন ম্যানেজমেন্ট সেবা | সিরিয়াল অনুযায়ী অপেক্ষা করুন',
        'থেরাপি চলাকালীন মোবাইল ফোন সাইলেন্ট রাখুন | Please silence your mobile phones in the therapy hall',
        'জরুরি যোগাযোগ ও হটলাইন: 01711-000000 | নামাজের বিরতি: দুপুর ১:১৫ হতে ১:৪৫ পর্যন্ত',
      ],
    };
  }

  async getCheckinOverview() {
    const today = todayDateString();

    // 1. All visits for today
    const todayVisits = await this.db
      .select({
        visit: visits,
        patient: patients,
        doctor: users,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(users, eq(visits.doctorId, users.id))
      .where(eq(visits.visitDate, today))
      .orderBy(desc(visits.createdAt));

    // 2. All therapy slot bookings for today
    const bookings = await this.db
      .select({
        booking: therapySlotBookings,
        patient: patients,
      })
      .from(therapySlotBookings)
      .innerJoin(patients, eq(therapySlotBookings.patientId, patients.id))
      .where(
        and(
          eq(therapySlotBookings.bookingDate, today),
          isNull(therapySlotBookings.deletedAt),
          sql`${therapySlotBookings.status} != 'cancelled'`,
        ),
      )
      .orderBy(therapySlotBookings.slotHour, therapySlotBookings.toldTime);

    // 2b. All consultation bookings for today
    const docBookings = await this.db
      .select({
        booking: consultationBookings,
        patient: patients,
        doctor: users,
      })
      .from(consultationBookings)
      .innerJoin(patients, eq(consultationBookings.patientId, patients.id))
      .leftJoin(users, eq(consultationBookings.doctorId, users.id))
      .where(
        and(
          eq(consultationBookings.bookingDate, today),
          isNull(consultationBookings.deletedAt),
          sql`${consultationBookings.status} != 'cancelled'`,
        ),
      )
      .orderBy(consultationBookings.slotTime);

    // 3. Live therapy queue
    const liveTherapyQueue = await this.db
      .select({
        visitId: visits.id,
        tokenNumber: visits.tokenNumber,
        patientId: patients.id,
        mrn: patients.mrn,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        phone: patients.phone,
        gender: patients.gender,
        priority: visits.priority,
        status: visits.status,
        currentLocation: visits.currentLocation,
        roomId: visits.roomId,
        toldTime: visits.toldTime,
        punctualityStatus: visits.punctualityStatus,
        delayMinutes: visits.delayMinutes,
        checkedInAt: visits.checkedInAt,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(
        and(
          eq(visits.visitDate, today),
          or(
            eq(visits.status, 'in_therapy'),
            and(
              sql`${visits.status} IN ('checked_in', 'waiting')`,
              or(
                and(
                  sql`${visits.therapyBookingId} IS NOT NULL`,
                  sql`${visits.therapyBookingId} NOT IN (SELECT id FROM therapy_slot_bookings WHERE status = 'cancelled' OR deleted_at IS NOT NULL)`,
                ),
                sql`${visits.currentLocation} IN ('therapy_hall', 'Therapy Hall')`,
                sql`${visits.patientId} IN (SELECT patient_id FROM therapy_slot_bookings WHERE booking_date = ${today} AND status NOT IN ('cancelled') AND deleted_at IS NULL)`,
              ),
            ),
          ),
        ),
      )
      .orderBy(visits.tokenNumber);

    // KPIs
    const totalCheckedIn = todayVisits.length;
    const totalBooked = bookings.length;
    const attendedBooked = bookings.filter((b) => b.booking.status === 'attended').length;
    const onTimeCount = todayVisits.filter((v) => v.visit.punctualityStatus === 'on_time').length;
    const moderateDelayCount = todayVisits.filter(
      (v) => v.visit.punctualityStatus === 'moderate_delay',
    ).length;
    const criticalDelayCount = todayVisits.filter(
      (v) => v.visit.punctualityStatus === 'critical_delay',
    ).length;

    return {
      date: today,
      stats: {
        totalCheckedIn,
        totalBooked,
        attendedBooked,
        onTimeCount,
        moderateDelayCount,
        criticalDelayCount,
      },
      todayBookings: bookings.map((b) => ({
        ...b.booking,
        patient: b.patient,
      })),
      todayConsultationBookings: docBookings.map((b) => ({
        ...b.booking,
        patient: b.patient,
        doctor: b.doctor ? { id: b.doctor.id, fullName: b.doctor.displayName } : null,
      })),
      liveTherapyQueue,
      recentCheckIns: todayVisits.map((v) => ({
        ...v.visit,
        patient: v.patient,
        doctor: v.doctor ? { id: v.doctor.id, fullName: v.doctor.displayName } : null,
      })),
    };
  }
}
