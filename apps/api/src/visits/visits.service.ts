import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  bills,
  billItems,
  cashDrawers,
  drawerEvents,
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
  type DayOfWeek,
  type SlotHour,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import { getPatientClinicalStatus } from '../patients/patient-clinical-status';
import type {
  CallSerialDto,
  CheckInDto,
  CheckOutDto,
  RoutePatientDto,
  SendToDoctorQueueDto,
  SendToTherapyQueueDto,
  RequestConsultationAdjustmentDto,
  ProcessConsultationAdjustmentDto,
} from './dto';

export function resolveServiceNames(typeStr?: string | null): {
  serviceType: string;
  serviceNameEn: string;
  serviceNameBn: string;
} {
  const rawType = (typeStr || 'therapy').toLowerCase().trim();
  let serviceNameEn = 'therapy';
  let serviceNameBn = 'থেরাপির';

  if (rawType === 'checkup' || rawType === 'check up' || rawType.includes('চেকআপ')) {
    serviceNameEn = 'checkup';
    serviceNameBn = 'চেকআপের';
  } else if (rawType === 'assessment' || rawType.includes('অ্যাসেসমেন্ট')) {
    serviceNameEn = 'assessment';
    serviceNameBn = 'অ্যাসেসমেন্টের';
  } else if (rawType === 'consultation' || rawType.includes('পরামর্শ')) {
    serviceNameEn = 'consultation';
    serviceNameBn = 'পরামর্শের';
  } else if (rawType === 'therapy' || rawType.includes('থেরাপি') || !rawType) {
    serviceNameEn = 'therapy';
    serviceNameBn = 'থেরাপির';
  } else {
    serviceNameEn = typeStr?.trim() || 'therapy';
    serviceNameBn = `${serviceNameEn} এর`;
  }

  return {
    serviceType: serviceNameEn,
    serviceNameEn,
    serviceNameBn,
  };
}

export const todayDateString = () => {
  const dhakaFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dhakaFormatter.format(new Date());
};

export function extractConsultationReason(notes?: string | null): string {
  if (!notes || !notes.trim()) return 'General Consultation';
  const match = notes.match(/^\[(.*?)\]/);
  if (match && match[1]?.trim()) {
    return match[1].trim();
  }
  return notes.trim();
}

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

  // Accurately extract hour and minute in Asia/Dhaka timezone regardless of server host runtime timezone
  const dhakaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = dhakaFormatter.formatToParts(checkInDate);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const currentMinutes = hour * 60 + minute;
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

  private async nextTokenNumber(dateStr?: string, year?: number): Promise<number> {
    const today = dateStr || todayDateString();
    const yr = year || parseInt(today.split('-')[0], 10) || new Date().getFullYear();
    // Daily sequence: resets to 1 every morning for clear queue tokens on thermal slips and TV screens
    const scope = `token_${today.replace(/-/g, '')}`;

    return this.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(sequences)
        .where(and(eq(sequences.scope, scope), eq(sequences.year, yr)))
        .all();
      if (existing.length === 0) {
        tx.insert(sequences).values({ scope, year: yr, lastValue: 1 }).run();
        return 1;
      }
      const nextVal = existing[0].lastValue + 1;
      tx.update(sequences)
        .set({ lastValue: nextVal })
        .where(and(eq(sequences.scope, scope), eq(sequences.year, yr)))
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
        'এই রোগী ইতিমধ্যে আজ চেক-ইন আছেন। পুনরায় চেক-ইন করার পূর্বে আগের ভিজিটটি চেক-আউট সম্পন্ন করতে হবে। (Patient is already checked in today. Must checkout before re-checking in.)',
      );
    }

    const tokenNumber = await this.nextTokenNumber(today, year);

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

    return Promise.all(
      rows.map(async (r) => {
        const patientClinicalStatus = await getPatientClinicalStatus(this.db, r.patient.id).catch(() => null);
        return {
          ...r.visit,
          patientClinicalStatus,
          patient: {
            id: r.patient.id,
            mrn: r.patient.mrn,
            nameEn: r.patient.nameEn,
            nameBn: r.patient.nameBn,
            phone: r.patient.phone,
            bloodGroup: r.patient.bloodGroup,
            allergies: r.patient.allergies,
            patientClinicalStatus,
            clinicalStatus: patientClinicalStatus,
          },
          doctor: r.doctor ? { id: r.doctor.id, fullName: r.doctor.displayName } : null,
        };
      }),
    );
  }

  async getDoctorQueue(doctorId: string) {
    const dhakaDate = todayDateString();
    const utcDate = new Date().toISOString().slice(0, 10);
    const candidateDates = Array.from(new Set([dhakaDate, utcDate]));
    const isSpecificDoctor = Boolean(doctorId && doctorId !== 'all' && doctorId !== 'undefined');

    const dateFilter = or(
      inArray(serials.date, candidateDates),
      inArray(visits.visitDate, candidateDates),
    )!;

    let rows: any[] = [];
    if (isSpecificDoctor) {
      rows = await this.db
        .select({
          serial: serials,
          patient: patients,
          visit: visits,
          doctor: users,
          chamber: rooms,
        })
        .from(serials)
        .innerJoin(patients, eq(serials.patientId, patients.id))
        .innerJoin(visits, eq(serials.visitId, visits.id))
        .leftJoin(users, eq(serials.doctorId, users.id))
        .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
        .where(
          and(
            eq(serials.doctorId, doctorId),
            dateFilter,
            isNull(visits.checkedOutAt),
            ne(visits.status, 'checked_out'),
            ne(visits.status, 'cancelled'),
            ne(visits.status, 'billed'),
          ),
        )
        .orderBy(serials.serialNumber);

      // If 0 rows found, check if this doctorId is actually a doctor or an admin/overseer
      if (rows.length === 0) {
        const [targetUser] = await this.db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, doctorId))
          .limit(1);
        if (!targetUser || targetUser.role !== 'doctor') {
          rows = await this.db
            .select({
              serial: serials,
              patient: patients,
              visit: visits,
              doctor: users,
              chamber: rooms,
            })
            .from(serials)
            .innerJoin(patients, eq(serials.patientId, patients.id))
            .innerJoin(visits, eq(serials.visitId, visits.id))
            .leftJoin(users, eq(serials.doctorId, users.id))
            .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
            .where(
              and(
                dateFilter,
                isNull(visits.checkedOutAt),
                ne(visits.status, 'checked_out'),
                ne(visits.status, 'cancelled'),
                ne(visits.status, 'billed'),
              ),
            )
            .orderBy(serials.serialNumber);
        }
      }
    } else {
      // doctorId is 'all', '', or undefined: return all serials for today across all doctors
      rows = await this.db
        .select({
          serial: serials,
          patient: patients,
          visit: visits,
          doctor: users,
          chamber: rooms,
        })
        .from(serials)
        .innerJoin(patients, eq(serials.patientId, patients.id))
        .innerJoin(visits, eq(serials.visitId, visits.id))
        .leftJoin(users, eq(serials.doctorId, users.id))
        .leftJoin(rooms, eq(users.chamberRoomId, rooms.id))
        .where(
          and(
            dateFilter,
            isNull(visits.checkedOutAt),
            ne(visits.status, 'checked_out'),
            ne(visits.status, 'cancelled'),
            ne(visits.status, 'billed'),
          ),
        )
        .orderBy(serials.serialNumber);
    }

    return Promise.all(
      rows.map(async (r) => {
        const patientClinicalStatus = await getPatientClinicalStatus(this.db, r.patient.id).catch(() => null);

        // Check if there is an intake form associated with this visit or patient
        let intakeFormId: string | null = null;
        try {
          const linkedIntake = await this.db
            .select({ id: patientIntakeForms.id, chiefComplaint: patientIntakeForms.chiefComplaint })
            .from(patientIntakeForms)
            .where(
              or(
                eq(patientIntakeForms.visitId, r.visit.id),
                eq(patientIntakeForms.patientId, r.patient.id),
              ),
            )
            .orderBy(desc(patientIntakeForms.createdAt))
            .limit(1);

          if (linkedIntake[0]) {
            intakeFormId = linkedIntake[0].id;
          } else if (patientClinicalStatus?.todayIntakeId) {
            intakeFormId = patientClinicalStatus.todayIntakeId;
          }
        } catch {}

        // Check if there is a consultation booking associated with the visit
        let bookingReason: string | null = null;
        if (r.visit.consultationBookingId) {
          try {
            const [booking] = await this.db
              .select({ notes: consultationBookings.notes })
              .from(consultationBookings)
              .where(eq(consultationBookings.id, r.visit.consultationBookingId))
              .limit(1);
            if (booking?.notes) {
              bookingReason = booking.notes;
            }
          } catch {}
        }

        // Clean reason extraction
        const rawNote = r.visit.notes || bookingReason || null;
        const reason = extractConsultationReason(rawNote);

        const feePaidPaisa = r.visit.consultationFeePaidPaisa ?? 0;
        const feePaidTaka = feePaidPaisa / 100;
        const isFree = feePaidPaisa === 0;

        return {
          ...r.serial,
          tokenNumber: r.visit.tokenNumber ?? r.serial.serialNumber,
          toldTime: r.visit.toldTime,
          punctualityStatus: r.visit.punctualityStatus,
          delayMinutes: r.visit.delayMinutes,
          patientClinicalStatus,
          clinicalStatus: patientClinicalStatus,
          patient: {
            id: r.patient.id,
            mrn: r.patient.mrn,
            nameEn: r.patient.nameEn,
            nameBn: r.patient.nameBn,
            phone: r.patient.phone,
            ageYears: r.patient.ageYears,
            gender: r.patient.gender,
            patientClinicalStatus,
            clinicalStatus: patientClinicalStatus,
          },
          priority: r.visit.priority,
          doctorName: r.doctor?.displayName,
          doctor: r.doctor ? { id: r.doctor.id, name: r.doctor.displayName } : null,
          chamber: r.chamber ? { id: r.chamber.id, name: r.chamber.name, roomNumber: r.chamber.roomNumber } : null,
          chamberRoomNumber: r.chamber?.roomNumber,
          chamberName: r.chamber?.name,
          roomNumber: r.chamber?.roomNumber,

          // Visit & consultation payload
          visit: {
            id: r.visit.id,
            tokenNumber: r.visit.tokenNumber,
            status: r.visit.status,
            currentLocation: r.visit.currentLocation,
            notes: r.visit.notes,
            consultationFeePaidPaisa: r.visit.consultationFeePaidPaisa,
            consultationAdjustmentType: r.visit.consultationAdjustmentType,
            consultationAdjustmentAmountPaisa: r.visit.consultationAdjustmentAmountPaisa,
            consultationAdjustmentReason: r.visit.consultationAdjustmentReason,
            consultationAdjustmentStatus: r.visit.consultationAdjustmentStatus,
          },
          consultationFeePaidPaisa: feePaidPaisa,
          consultationFeePaidTaka: feePaidTaka,
          isFree,
          reason,
          intakeFormId,
          bookingReason,
        };
      }),
    );
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
      const isSpecificDoctor = Boolean(doctorId && doctorId !== 'all' && doctorId !== 'undefined');
      let rows = isSpecificDoctor
        ? await this.db
            .select({ serial: serials })
            .from(serials)
            .innerJoin(visits, eq(serials.visitId, visits.id))
            .where(
              and(
                eq(serials.doctorId, doctorId),
                eq(serials.date, today),
                eq(serials.status, 'waiting'),
                isNull(visits.checkedOutAt),
                ne(visits.status, 'checked_out'),
                ne(visits.status, 'cancelled'),
              ),
            )
            .orderBy(serials.serialNumber)
            .limit(1)
        : [];

      if (!rows.length) {
        // Fallback: look for waiting serials across all doctors for today
        rows = await this.db
          .select({ serial: serials })
          .from(serials)
          .innerJoin(visits, eq(serials.visitId, visits.id))
          .where(
            and(
              eq(serials.date, today),
              eq(serials.status, 'waiting'),
              isNull(visits.checkedOutAt),
              ne(visits.status, 'checked_out'),
              ne(visits.status, 'cancelled'),
            ),
          )
          .orderBy(serials.serialNumber)
          .limit(1);
      }
      targetSerial = rows[0]?.serial;
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

    const effectiveDoctorId = targetSerial.doctorId || doctorId;

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
        descriptionEn: `Doctor ${doctorName} called patient to Room ${chamberNumber}`,
        descriptionBn: `ডাক্তার ${doctorName} রোগী ${payload.patientNameBn}-কে রুম নম্বর ${chamberNumber}-এ ডাকছেন।`,
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
        descriptionEn: `Patient arrived in chamber; consultation in progress with Doctor ${doctorName}`,
        descriptionBn: `রোগী চেম্বারে উপস্থিত হয়েছেন এবং ডাক্তার ${doctorName}-এর সাথে পরামর্শ শুরু হয়েছে।`,
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
    let targetLocation = dto.location;

    if (dto.location === 'therapy_hall' || dto.location === 'therapy') {
      newStatus = 'checked_in';
      targetLocation = 'therapy_hall';
    } else if (dto.location === 'cashier') {
      targetLocation = 'cashier';
      newStatus = 'billed';
    } else if (dto.location === 'reception') {
      targetLocation = 'reception';
      newStatus = 'checked_in';
    } else if (dto.location === 'exit') {
      targetLocation = 'exit';
      newStatus = 'checked_out';
    }

    await this.db
      .update(visits)
      .set({
        currentLocation: targetLocation,
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    // When routed away from doctor chamber (e.g. to therapy, reception, cashier, or exit),
    // complete any open or waiting consultation serials and bookings for this visit
    if (targetLocation !== 'chamber') {
      await this.db
        .update(serials)
        .set({ status: 'completed', completedAt: now, updatedAt: now })
        .where(
          and(
            eq(serials.visitId, visitId),
            inArray(serials.status, ['waiting', 'called', 'in_chamber']),
          ),
        );

      if (visit.consultationBookingId) {
        await this.db
          .update(consultationBookings)
          .set({ status: 'completed', updatedAt: now })
          .where(eq(consultationBookings.id, visit.consultationBookingId))
          .catch(() => {});
      } else {
        const today = now.slice(0, 10);
        await this.db
          .update(consultationBookings)
          .set({ status: 'completed', updatedAt: now })
          .where(
            and(
              eq(consultationBookings.patientId, visit.patientId),
              eq(consultationBookings.bookingDate, today),
              sql`${consultationBookings.status} NOT IN ('cancelled', 'completed')`,
            ),
          )
          .catch(() => {});
      }

      this.gateway.emit('clinic:global', 'queue.updated', { visitId, type: 'consultation', status: 'completed' });
      this.gateway.emit('clinic:global', 'tv:updated', { source: 'patient.routed', visitId });
      this.realtime.publish('queue.updated', { visitId, type: 'consultation', status: 'completed' });
      this.realtime.publish('tv:updated', { source: 'patient.routed', visitId });
    }

    // When routed away from therapy_hall (e.g. to cashier, reception, or exit)
    if (targetLocation !== 'therapy_hall') {
      const today = now.slice(0, 10);
      if (visit.therapyBookingId) {
        await this.db
          .update(therapySlotBookings)
          .set({ status: 'completed', updatedAt: now })
          .where(eq(therapySlotBookings.id, visit.therapyBookingId))
          .catch(() => {});
      } else {
        await this.db
          .update(therapySlotBookings)
          .set({ status: 'completed', updatedAt: now })
          .where(
            and(
              eq(therapySlotBookings.patientId, visit.patientId),
              eq(therapySlotBookings.bookingDate, today),
              sql`${therapySlotBookings.status} NOT IN ('cancelled', 'completed')`,
            ),
          )
          .catch(() => {});
      }

      // Complete any running therapy sessions
      await this.db
        .update(therapySessions)
        .set({ status: 'completed', endedAt: now, updatedAt: now })
        .where(
          and(
            eq(therapySessions.patientId, visit.patientId),
            sql`${therapySessions.status} IN ('in_progress', 'scheduled', 'paused')`,
          ),
        )
        .catch(() => {});
    }

    const payload = {
      visitId,
      patientId: visit.patientId,
      previousLocation: visit.currentLocation,
      currentLocation: targetLocation,
      status: newStatus,
      targetId: dto.targetId ?? null,
    };

    this.gateway.emit('clinic:global', 'patient.routed', payload);
    this.gateway.emit('clinic:global', 'visit.routed', payload);
    this.realtime.publish('patient.routed', payload);
    this.realtime.publish('visit.routed', payload);

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

    // Explicitly complete any remaining active or waiting serials for this visit
    await this.db
      .update(serials)
      .set({
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(serials.visitId, visitId),
          inArray(serials.status, ['waiting', 'called', 'in_chamber']),
        ),
      );

    // Explicitly complete any remaining in-progress therapy sessions for this patient
    await this.db
      .update(therapySessions)
      .set({
        status: 'completed',
        endedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(therapySessions.patientId, item.patient.id),
          eq(therapySessions.status, 'in_progress'),
        ),
      );

    // Departure slip payload
    const departureSlip = await this.getDepartureSlip(visitId);

    this.gateway.emit('clinic:global', 'visit.checked_out', {
      visitId,
      patientId: item.patient.id,
      patientName: item.patient.nameEn,
      checkedOutAt: now,
    });
    this.gateway.emit('clinic:global', 'visit.updated', {
      visitId,
      patientId: item.patient.id,
      status: 'checked_out',
    });
    this.gateway.emit('clinic:global', 'therapy.session_completed', {
      visitId,
      patientId: item.patient.id,
    });
    this.gateway.emit('clinic:global', 'therapy.queue_updated', {
      visitId,
      patientId: item.patient.id,
    });
    this.gateway.emit('clinic:global', 'queue.updated', {
      type: 'consultation',
      visitId,
      status: 'completed',
    });
    this.gateway.emit('clinic:global', 'tv:updated', {
      source: 'visit.check_out',
      visitId,
    });
    this.realtime.publish('visit.checked_out', {
      visitId,
      patientId: item.patient.id,
      checkedOutAt: now,
    });
    this.realtime.publish('queue.updated', {
      type: 'consultation',
      visitId,
      status: 'completed',
    });
    this.realtime.publish('tv:updated', {
      source: 'visit.check_out',
      visitId,
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
    let doctorId = dto?.doctorId || item.visit.doctorId;
    if (!doctorId) {
      const docs = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'doctor'))
        .limit(1);
      doctorId = docs[0]?.id;
    }
    if (!doctorId) {
      throw new BadRequestException('Cannot queue: No doctor available in the system');
    }

    const today = item.visit.visitDate || todayDateString();
    const now = new Date().toISOString();

    // Persist doctor assignment and visit note with reason
    const visitReasonNote = dto?.reason
      ? `[${dto.reason}] ${dto?.notes || ''}`.trim()
      : dto?.notes || item.visit.notes;

    // DUAL-PATH LOGIC:
    // If NOT free (i.e. fee-based consultation where isFree === false and feeTaka > 0):
    // Forward patient to Cashier for fee collection first!
    if (dto?.isFree === false && dto?.feeTaka !== undefined && dto?.feeTaka > 0) {
      const feeTaka = dto.feeTaka;
      await this.db
        .update(visits)
        .set({
          doctorId,
          currentLocation: 'Cashier',
          notes: visitReasonNote,
          updatedAt: now,
        })
        .where(eq(visits.id, visitId));

      // Check if an intake form exists for this visit
      const existingIntakes = await this.db
        .select()
        .from(patientIntakeForms)
        .where(eq(patientIntakeForms.visitId, visitId))
        .limit(1);

      let intakeResult: any;

      if (existingIntakes[0]) {
        await this.db
          .update(patientIntakeForms)
          .set({
            doctorId,
            consultationFeeTaka: feeTaka,
            status: 'forwarded_to_cashier',
            specialNotes: visitReasonNote,
            forwardedToCashierAt: now,
            updatedAt: now,
          })
          .where(eq(patientIntakeForms.id, existingIntakes[0].id));
        intakeResult = {
          ...existingIntakes[0],
          doctorId,
          consultationFeeTaka: feeTaka,
          status: 'forwarded_to_cashier',
          specialNotes: visitReasonNote,
          forwardedToCashierAt: now,
          doctorFee: feeTaka,
          doctorName: item.doctor?.displayName || 'Doctor',
          patient: item.patient,
          tokenNumber: item.visit.tokenNumber,
        };
      } else {
        const intakeId = randomUUID();
        const actorUser = await this.db.select().from(users).where(eq(users.id, actor.sub));
        const receptionistName = actorUser[0]?.displayName || 'Reception';
        const newIntake = {
          id: intakeId,
          patientId: item.patient.id,
          visitId,
          doctorId,
          receptionistId: actor.sub,
          receptionistName,
          date: today,
          name: item.patient.nameBn || item.patient.nameEn,
          ageYears: item.patient.ageYears ?? null,
          phone: item.patient.phone,
          gender: (item.patient.gender as any) || 'male',
          chiefComplaint: dto?.reason || 'ডাক্তার কনসালটেশন (Doctor Consultation)',
          specialNotes: visitReasonNote,
          consultationFeeTaka: feeTaka,
          status: 'forwarded_to_cashier' as const,
          forwardedToCashierAt: now,
          createdAt: now,
          updatedAt: now,
        };
        await this.db.insert(patientIntakeForms).values(newIntake);
        intakeResult = {
          ...newIntake,
          doctorFee: feeTaka,
          doctorName: item.doctor?.displayName || 'Doctor',
          patient: item.patient,
          tokenNumber: item.visit.tokenNumber,
        };
      }

      // Log timeline event
      try {
        await this.db.insert(patientTimelineEvents).values({
          id: randomUUID(),
          patientId: item.patient.id,
          visitId,
          intakeFormId: intakeResult.id,
          step: 'forwarded_to_cashier',
          titleEn: 'Forwarded to Cashier for Fee Collection',
          titleBn: 'কনসালটেশন ফি গ্রহণের জন্য ক্যাশিয়ারে পাঠানো হয়েছে',
          descriptionEn: `Consultation fee: ৳${feeTaka}. Assigned doctor: ${item.doctor?.displayName || 'Doctor'}. Reason: ${dto?.reason || 'Consultation'}`,
          descriptionBn: `কনসালটেশন ফি: ৳${feeTaka}। নির্ধারিত ডাক্তার: ${item.doctor?.displayName || 'ডাক্তার'}। কারণ: ${dto?.reason || 'পরামর্শ'}`,
          actorId: actor.sub,
          actorName: actor.role,
          actorRole: actor.role,
          date: today,
          occurredAt: now,
        });
      } catch {}

      // Emit realtime events
      this.gateway.emit('clinic:global', 'intake.created', intakeResult);
      this.gateway.emit('clinic:global', 'intake.forwarded_to_cashier', intakeResult);
      this.gateway.emit('clinic:global', 'visit.routed', { visitId, currentLocation: 'Cashier' });
      this.gateway.emit('clinic:global', 'queue.updated', { scope: 'reception', date: today });
      this.realtime.publish('intake.forwarded_to_cashier', intakeResult);

      return {
        ok: true,
        forwardedToCashier: true,
        feeTaka,
        intake: intakeResult,
      };
    }

    await this.db
      .update(visits)
      .set({
        doctorId,
        currentLocation: 'doctor_chamber',
        notes: visitReasonNote,
        consultationFeePaidPaisa: dto?.isFree ? 0 : item.visit.consultationFeePaidPaisa,
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    // Atomic transaction for doctor chamber serial assignment: prevents race conditions under concurrent check-ins
    const { serialRow, isNew } = this.db.transaction((tx) => {
      // Check if already in queue
      const existingSerial = tx
        .select()
        .from(serials)
        .where(and(eq(serials.visitId, visitId), eq(serials.status, 'waiting')))
        .all();

      if (existingSerial[0]) {
        return { serialRow: existingSerial[0], isNew: false };
      }

      // Find current maximum serial for this doctor on this day
      const maxRow = tx
        .select({ maxSerial: sql<number>`COALESCE(MAX(${serials.serialNumber}), 0)` })
        .from(serials)
        .where(and(eq(serials.doctorId, doctorId), eq(serials.date, today)))
        .all();

      const nextSerialNum = (maxRow[0]?.maxSerial ?? 0) + 1;
      const serialId = randomUUID();

      const row = {
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

      tx.insert(serials).values(row).run();

      // If linked to consultationBookings, update it
      if (item.visit.consultationBookingId) {
        tx.update(consultationBookings)
          .set({
            status: 'in_queue',
            serialNumber: nextSerialNum,
            serialId,
            inQueueAt: now,
            queuedBy: actor.sub,
            updatedAt: now,
          })
          .where(eq(consultationBookings.id, item.visit.consultationBookingId))
          .run();
      }

      return { serialRow: row, isNew: true };
    });

    if (!isNew) {
      return { ok: true, serial: serialRow };
    }

    const eventPayload = {
      visitId,
      serialId: serialRow.id,
      serialNumber: serialRow.serialNumber,
      doctorId,
      doctorName: item.doctor?.displayName,
      chamber: item.chamber?.name,
      patientId: item.patient.id,
      patientName: item.patient.nameEn,
      patientNameBn: item.patient.nameBn || item.patient.nameEn,
      reason: dto?.reason || 'General Consultation',
      notes: dto?.notes || null,
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
        entityId: serialRow.id,
        after: eventPayload,
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    return { ok: true, serialNumber: serialRow.serialNumber, serialId: serialRow.id };
  }

  async sendToTherapyQueue(
    actor: { sub: string; role: string },
    visitId: string,
    dto: SendToTherapyQueueDto,
    meta?: { ip?: string | null; requestId?: string | null },
  ) {
    const rows = await this.db
      .select({
        visit: visits,
        patient: patients,
        room: rooms,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(rooms, eq(visits.roomId, rooms.id))
      .where(eq(visits.id, visitId));

    const item = rows[0];
    if (!item) throw new NotFoundException('Visit not found');

    if (item.visit.status === 'checked_out' || item.visit.status === 'cancelled') {
      throw new BadRequestException('Patient is not currently checked in');
    }

    const today = item.visit.visitDate || todayDateString();
    const now = new Date().toISOString();
    const therapyType = dto.therapyType?.trim() || item.visit.therapyType || 'therapy';
    const targetRoomId = dto.roomId || item.visit.roomId || null;

    let targetRoomName = dto.roomName || null;
    if (!targetRoomName && targetRoomId) {
      const roomRow = await this.db.select().from(rooms).where(eq(rooms.id, targetRoomId));
      if (roomRow[0]) {
        targetRoomName = roomRow[0].name;
      }
    }

    const updatedNotes = dto.notes
      ? (item.visit.notes ? `${item.visit.notes} | ${dto.notes.trim()}` : dto.notes.trim())
      : item.visit.notes;

    // Check if patient already has an active therapy slot booking for today
    let activeBookingId = item.visit.therapyBookingId;
    let existingBooking = null;

    if (activeBookingId) {
      const bRows = await this.db
        .select()
        .from(therapySlotBookings)
        .where(
          and(
            eq(therapySlotBookings.id, activeBookingId),
            isNull(therapySlotBookings.deletedAt),
            ne(therapySlotBookings.status, 'cancelled'),
          ),
        );
      existingBooking = bRows[0] || null;
    }

    if (!existingBooking) {
      const bRows = await this.db
        .select()
        .from(therapySlotBookings)
        .where(
          and(
            eq(therapySlotBookings.patientId, item.patient.id),
            eq(therapySlotBookings.bookingDate, today),
            isNull(therapySlotBookings.deletedAt),
            ne(therapySlotBookings.status, 'cancelled'),
          ),
        )
        .limit(1);
      existingBooking = bRows[0] || null;
    }

    if (existingBooking) {
      activeBookingId = existingBooking.id;
      try {
        await this.db
          .update(therapySlotBookings)
          .set({ therapyType, updatedAt: now })
          .where(eq(therapySlotBookings.id, existingBooking.id));
      } catch {}
    } else {
      // Create a complimentary ৳0 booking so it appears cleanly everywhere
      const bookingId = randomUUID();
      const dateClean = today.replace(/-/g, '');
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingNumber = `TSB-${dateClean}-${randSuffix}`;

      const dayOfWeekName = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        timeZone: 'Asia/Dhaka',
      }).format(new Date()) as DayOfWeek;

      const dhakaHour = Number(
        new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone: 'Asia/Dhaka',
        }).format(new Date()),
      );
      const startHour12 = dhakaHour % 12 === 0 ? 12 : dhakaHour % 12;
      const startAmPm = dhakaHour < 12 ? 'AM' : 'PM';
      const endHour24 = (dhakaHour + 1) % 24;
      const endHour12 = endHour24 % 12 === 0 ? 12 : endHour24 % 12;
      const endAmPm = endHour24 < 12 ? 'AM' : 'PM';
      const calculatedSlotHour = `${startHour12}:00 ${startAmPm} - ${endHour12}:00 ${endAmPm}` as SlotHour;

      await this.db.insert(therapySlotBookings).values({
        id: bookingId,
        bookingNumber,
        patientId: item.patient.id,
        bookingDate: today,
        dayOfWeek: dayOfWeekName,
        slotHour: calculatedSlotHour,
        toldTime: item.visit.toldTime || null,
        patientGender: item.patient.gender === 'female' ? 'female' : 'male',
        capacityType: 'regular',
        status: 'attended',
        therapyType,
        checkedInAt: item.visit.checkedInAt || now,
        punctualityStatus: item.visit.punctualityStatus || 'on_time',
        delayMinutes: item.visit.delayMinutes || 0,
        notes: `Complimentary ${therapyType} assignment (৳0)`,
        bookedBy: actor.sub,
        createdAt: now,
        updatedAt: now,
      });

      activeBookingId = bookingId;
    }

    // Update visit
    await this.db
      .update(visits)
      .set({
        currentLocation: 'therapy_hall',
        status: 'checked_in',
        therapyType,
        roomId: targetRoomId,
        calledRoomId: targetRoomId,
        calledRoomName: targetRoomName,
        notes: updatedNotes,
        therapyBookingId: activeBookingId,
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    try {
      (this.db as any).session?.client
        ?.prepare(
          'UPDATE visits SET current_location = ?, status = ?, therapy_type = ?, room_id = ?, called_room_id = ?, called_room_name = ?, therapy_booking_id = ?, updated_at = ? WHERE id = ?',
        )
        ?.run(
          'therapy_hall',
          'checked_in',
          therapyType,
          targetRoomId,
          targetRoomId,
          targetRoomName,
          activeBookingId,
          now,
          visitId,
        );
    } catch {}

    // When routed to therapy, complete any open/waiting consultation serials for this visit
    await this.db
      .update(serials)
      .set({ status: 'completed', completedAt: now, updatedAt: now })
      .where(
        and(
          eq(serials.visitId, visitId),
          inArray(serials.status, ['waiting', 'called', 'in_chamber']),
        ),
      );

    const sInfo = resolveServiceNames(therapyType);
    const routedPayload = {
      visitId,
      patientId: item.patient.id,
      patientNameEn: item.patient.nameEn,
      patientNameBn: item.patient.nameBn || item.patient.nameEn,
      tokenNumber: item.visit.tokenNumber,
      previousLocation: item.visit.currentLocation,
      currentLocation: 'therapy_hall',
      status: 'waiting',
      therapyType,
      serviceType: sInfo.serviceType,
      serviceNameEn: sInfo.serviceNameEn,
      serviceNameBn: sInfo.serviceNameBn,
      roomId: targetRoomId,
      roomName: targetRoomName,
    };

    this.gateway.emit('clinic:global', 'visit.routed', routedPayload);
    this.gateway.emit('clinic:global', 'patient.routed', routedPayload);
    this.gateway.emit('clinic:global', 'queue.updated', { scope: 'therapy', date: today, visitId, therapyType });
    this.gateway.emit('clinic:global', 'queue.updated', { scope: 'reception', date: today, visitId });
    this.gateway.emit('clinic:global', 'tv:updated', { source: 'visit.send_to_therapy_queue', visitId });

    this.realtime.publish('visit.routed', routedPayload);
    this.realtime.publish('patient.routed', routedPayload);
    this.realtime.publish('queue.updated', { scope: 'therapy', date: today, visitId, therapyType });
    this.realtime.publish('queue.updated', { scope: 'reception', date: today, visitId });
    this.realtime.publish('tv:updated', { source: 'visit.send_to_therapy_queue', visitId });

    const typeTitleEn = therapyType.charAt(0).toUpperCase() + therapyType.slice(1);
    let typeTitleBn = sInfo.serviceNameBn.replace(/এর$/, '').trim();
    if (!typeTitleBn) typeTitleBn = 'থেরাপি';

    try {
      await this.db.insert(patientTimelineEvents).values({
        id: randomUUID(),
        patientId: item.patient.id,
        visitId,
        step: 'sent_to_therapy_queue',
        titleEn: `Sent to Therapy Queue (${typeTitleEn})`,
        titleBn: `থেরাপি কিউতে পাঠানো হয়েছে (${typeTitleBn})`,
        descriptionEn: `Patient sent to therapy queue for ${therapyType} by ${actor.role}. Free complimentary assignment (৳0).`,
        descriptionBn: `${actor.role} কর্তৃক রোগীকে ${typeTitleBn}-এর জন্য থেরাপি কিউতে পাঠানো হয়েছে (৳০)।`,
        actorId: actor.sub,
        actorName: actor.role,
        actorRole: actor.role,
        metadataJson: JSON.stringify({ therapyType, roomId: targetRoomId, notes: dto?.notes }),
        date: today,
        occurredAt: now,
      });
    } catch (e) {
      console.warn('Timeline log error:', e);
    }

    if (meta) {
      await this.audit.log({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'visits.send_to_therapy_queue',
        entity: 'visits',
        entityId: visitId,
        after: { visitId, therapyType, roomId: targetRoomId },
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    return { ok: true, visitId, therapyType };
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
        .innerJoin(visits, eq(serials.visitId, visits.id))
        .where(
          and(
            eq(serials.doctorId, doc.id),
            eq(serials.date, today),
            eq(serials.status, 'called'),
            isNull(visits.checkedOutAt),
            ne(visits.status, 'checked_out'),
            ne(visits.status, 'cancelled'),
          ),
        )
        .orderBy(desc(serials.calledAt))
        .limit(1);

      const nextWaiting = await this.db
        .select({
          serial: serials,
          patient: patients,
        })
        .from(serials)
        .innerJoin(patients, eq(serials.patientId, patients.id))
        .innerJoin(visits, eq(serials.visitId, visits.id))
        .where(
          and(
            eq(serials.doctorId, doc.id),
            eq(serials.date, today),
            eq(serials.status, 'waiting'),
            isNull(visits.checkedOutAt),
            ne(visits.status, 'checked_out'),
            ne(visits.status, 'cancelled'),
            ne(visits.status, 'billed'),
          ),
        )
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
          isNull(visits.checkedOutAt),
          ne(visits.status, 'checked_out'),
          ne(visits.status, 'cancelled'),
          ne(visits.status, 'billed'),
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
      .where(
        and(
          eq(serials.date, today),
          eq(serials.status, 'waiting'),
          isNull(visits.checkedOutAt),
          ne(visits.status, 'checked_out'),
          ne(visits.status, 'cancelled'),
          ne(visits.status, 'billed'),
        ),
      )
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
        therapyType: visits.therapyType,
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
      ...callingTherapies.map((c) => {
        const roomNum = c.roomNumber || 1;
        const roomNameWithNum = c.roomName
          ? (/\d/.test(c.roomName) ? c.roomName : `${c.roomName} ${roomNum}`)
          : `Therapy Room ${roomNum}`;
        const tok = (c.tokenNumber && Number(c.tokenNumber) > 0) ? Number(c.tokenNumber) : 1;
        const sInfo = resolveServiceNames(c.therapyType);
        return {
          sessionId: c.visitId,
          visitId: c.visitId,
          tokenNumber: tok,
          serialNumber: tok,
          patientNameEn: c.patientNameEn,
          patientNameBn: c.patientNameBn || c.patientNameEn,
          modalityCode: 'PHYSIO',
          modalityNameEn: 'Physiotherapy & Rehab',
          modalityNameBn: 'ফিজিওথেরাপি ও পুনর্বাসন',
          bedName: roomNameWithNum,
          roomName: roomNameWithNum,
          roomNumber: roomNum,
          startedAt: c.updatedAt,
          status: 'calling',
          type: 'therapy',
          isTherapy: true,
          therapyType: c.therapyType || 'therapy',
          serviceType: sInfo.serviceType,
          serviceNameEn: sInfo.serviceNameEn,
          serviceNameBn: sInfo.serviceNameBn,
        };
      }),
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
        roomNumber: rooms.roomNumber,
        roomName: rooms.name,
        therapyType: visits.therapyType,
        checkedInAt: visits.checkedInAt,
        toldTime: visits.toldTime,
        punctualityStatus: visits.punctualityStatus,
        delayMinutes: visits.delayMinutes,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(rooms, eq(visits.roomId, rooms.id))
      .where(
        and(
          eq(visits.visitDate, today),
          sql`${visits.status} IN ('checked_in', 'waiting')`,
          sql`${visits.status} NOT IN ('calling', 'in_therapy', 'completed', 'checked_out', 'cancelled', 'billed')`,
          sql`${visits.patientId} NOT IN (SELECT patient_id FROM therapy_sessions WHERE status = 'in_progress')`,
          or(
            and(
              sql`${visits.therapyBookingId} IS NOT NULL`,
              sql`${visits.therapyBookingId} NOT IN (SELECT id FROM therapy_slot_bookings WHERE status IN ('cancelled', 'completed') OR deleted_at IS NOT NULL)`,
            ),
            sql`${visits.currentLocation} IN ('therapy_hall', 'Therapy Hall')`,
            sql`${visits.patientId} IN (SELECT patient_id FROM therapy_slot_bookings WHERE booking_date = ${today} AND status NOT IN ('cancelled', 'completed') AND deleted_at IS NULL)`,
          ),
        ),
      )
      .orderBy(visits.tokenNumber)
      .limit(30);

    const mappedWaitingTherapies = waitingTherapies.map((w) => {
      const sInfo = resolveServiceNames(w.therapyType);
      return {
        ...w,
        therapyType: w.therapyType || 'therapy',
        serviceType: sInfo.serviceType,
        serviceNameEn: sInfo.serviceNameEn,
        serviceNameBn: sInfo.serviceNameBn,
      };
    });

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
        waiting: mappedWaitingTherapies,
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
        legacyId: patients.legacyId,
        patientNameEn: patients.nameEn,
        patientNameBn: patients.nameBn,
        phone: patients.phone,
        address: patients.address,
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
                  sql`${visits.therapyBookingId} NOT IN (SELECT id FROM therapy_slot_bookings WHERE status IN ('cancelled', 'completed') OR deleted_at IS NOT NULL)`,
                ),
                sql`${visits.currentLocation} IN ('therapy_hall', 'Therapy Hall')`,
                sql`${visits.patientId} IN (SELECT patient_id FROM therapy_slot_bookings WHERE booking_date = ${today} AND status NOT IN ('cancelled', 'completed') AND deleted_at IS NULL)`,
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

  async requestConsultationAdjustment(
    actor: { sub: string; role: string },
    visitId: string,
    dto: RequestConsultationAdjustmentDto,
  ) {
    const rows = await this.db
      .select({
        visit: visits,
        patient: patients,
        doctor: users,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(users, eq(visits.doctorId, users.id))
      .where(eq(visits.id, visitId));
    const item = rows[0];
    if (!item) throw new NotFoundException('Visit not found');

    const amountPaisa = Math.round(dto.amountTaka * 100);
    const now = new Date().toISOString();

    await this.db
      .update(visits)
      .set({
        currentLocation: 'Cashier',
        consultationAdjustmentType: dto.adjustmentType,
        consultationAdjustmentAmountPaisa: amountPaisa,
        consultationAdjustmentReason: dto.reason,
        consultationAdjustmentStatus: 'pending',
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    // Complete any open consultation serials for this visit so doctor chamber is freed
    await this.db
      .update(serials)
      .set({ status: 'completed', completedAt: now, updatedAt: now })
      .where(
        and(
          eq(serials.visitId, visitId),
          inArray(serials.status, ['waiting', 'called', 'in_chamber']),
        ),
      );

    const payload = {
      visitId,
      patientId: item.patient.id,
      patientName: item.patient.nameEn,
      patientNameBn: item.patient.nameBn,
      mrn: item.patient.mrn,
      phone: item.patient.phone,
      doctorName: item.doctor?.displayName || 'Doctor',
      adjustmentType: dto.adjustmentType,
      amountTaka: dto.amountTaka,
      amountPaisa,
      reason: dto.reason,
      consultationFeePaidPaisa: item.visit.consultationFeePaidPaisa || 0,
      currentLocation: 'Cashier',
    };

    this.gateway.emit('clinic:global', 'consultation.adjustment_requested', payload);
    this.gateway.emit('clinic:global', 'patient.routed', payload);
    this.gateway.emit('clinic:global', 'tv:updated', { source: 'consultation.adjustment', visitId });
    this.realtime.publish('consultation.adjustment_requested', payload);
    this.realtime.publish('patient.routed', payload);

    return { ok: true, ...payload };
  }

  async processConsultationAdjustment(
    actor: { sub: string; role: string },
    visitId: string,
    dto: ProcessConsultationAdjustmentDto,
  ) {
    const rows = await this.db
      .select({
        visit: visits,
        patient: patients,
        doctor: users,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(users, eq(visits.doctorId, users.id))
      .where(eq(visits.id, visitId));
    const item = rows[0];
    if (!item) throw new NotFoundException('Visit not found');
    const now = new Date().toISOString();

    if (dto.status === 'rejected') {
      await this.db
        .update(visits)
        .set({
          consultationAdjustmentStatus: 'rejected',
          currentLocation: 'reception',
          updatedAt: now,
        })
        .where(eq(visits.id, visitId));

      const payload = {
        visitId,
        patientId: item.patient.id,
        status: 'rejected',
        currentLocation: 'reception',
      };
      this.gateway.emit('clinic:global', 'consultation.adjustment_processed', payload);
      this.gateway.emit('clinic:global', 'patient.routed', payload);
      this.realtime.publish('consultation.adjustment_processed', payload);
      this.realtime.publish('patient.routed', payload);
      return { ok: true, ...payload };
    }

    const adjType = item.visit.consultationAdjustmentType;
    const adjAmountPaisa = item.visit.consultationAdjustmentAmountPaisa || 0;
    const adjAmountTaka = Math.round(adjAmountPaisa / 100);
    const prevPaidPaisa = item.visit.consultationFeePaidPaisa || 0;
    let nextPaidPaisa = prevPaidPaisa;

    if (adjType === 'refund') {
      nextPaidPaisa = Math.max(0, prevPaidPaisa - adjAmountPaisa);
    } else if (adjType === 'payment_collection') {
      nextPaidPaisa = prevPaidPaisa + adjAmountPaisa;
    }

    // Find active cash drawer for recording drawer payout / sale
    const openDrawers = await this.db
      .select()
      .from(cashDrawers)
      .where(eq(cashDrawers.status, 'open'))
      .orderBy(desc(cashDrawers.openedAt))
      .limit(1);

    if (openDrawers[0]) {
      const drawer = openDrawers[0];
      const eventType = adjType === 'refund' ? 'payout' : 'sale_cash';
      await this.db.insert(drawerEvents).values({
        id: randomUUID(),
        drawerId: drawer.id,
        eventType,
        amountPaisa: adjAmountPaisa,
        description: `Consultation Adjustment (${adjType}) - Patient: ${item.patient.nameEn} (MRN: ${item.patient.mrn}) - Reason: ${item.visit.consultationAdjustmentReason || 'N/A'}`,
        staffId: actor.sub,
        createdAt: now,
        updatedAt: now,
      });
      this.gateway.emit('clinic:global', 'drawer.event_created', { drawerId: drawer.id });
    }

    // Create an official bill record for this adjustment
    const billNumber = `INV-${Date.now().toString().slice(-6)}`;
    const billId = randomUUID();
    const isRefund = adjType === 'refund';

    await this.db.insert(bills).values({
      id: billId,
      billNumber,
      visitId,
      patientId: item.patient.id,
      cashierStaffId: actor.sub,
      subtotalPaisa: isRefund ? -adjAmountPaisa : adjAmountPaisa,
      discountPaisa: 0,
      totalPaisa: isRefund ? -adjAmountPaisa : adjAmountPaisa,
      paidPaisa: isRefund ? -adjAmountPaisa : adjAmountPaisa,
      duePaisa: 0,
      status: 'posted',
      paymentMethod: dto.paymentMethod || 'cash',
      notes: `Consultation Adjustment: ${adjType}. Reason: ${item.visit.consultationAdjustmentReason || 'None'}`,
      createdAt: now,
      updatedAt: now,
    });

    await this.db.insert(billItems).values({
      id: randomUUID(),
      billId,
      itemType: 'consultation',
      description: isRefund
        ? `কনসালটেশন ফি রিফান্ড (${item.doctor?.displayName || 'ডাক্তার'}) - কারণ: ${item.visit.consultationAdjustmentReason || 'N/A'}`
        : `কনসালটেশন ফি (${item.doctor?.displayName || 'ডাক্তার'}) - ${item.visit.consultationAdjustmentReason || 'N/A'}`,
      unitPricePaisa: isRefund ? -adjAmountPaisa : adjAmountPaisa,
      quantity: 1,
      discountPaisa: 0,
      totalPaisa: isRefund ? -adjAmountPaisa : adjAmountPaisa,
    });

    // Update visit
    await this.db
      .update(visits)
      .set({
        consultationFeePaidPaisa: nextPaidPaisa,
        consultationAdjustmentStatus: 'completed',
        currentLocation: 'reception',
        updatedAt: now,
      })
      .where(eq(visits.id, visitId));

    const invoiceData = {
      billNumber,
      patientName: item.patient.nameEn,
      patientNameBn: item.patient.nameBn || undefined,
      mrn: item.patient.mrn,
      phone: item.patient.phone || undefined,
      ageYears: item.patient.ageYears || undefined,
      gender: item.patient.gender || undefined,
      cashierName: actor.role || 'Cashier Desk',
      items: [
        {
          itemType: 'consultation',
          description: isRefund
            ? `কনসালটেশন ফি রিফান্ড (${item.doctor?.displayName || 'ডাক্তার'}) - ${item.visit.consultationAdjustmentReason || 'N/A'}`
            : `কনসালটেশন ফি (${item.doctor?.displayName || 'ডাক্তার'}) - ${item.visit.consultationAdjustmentReason || 'N/A'}`,
          unitPriceTaka: isRefund ? -adjAmountTaka : adjAmountTaka,
          quantity: 1,
          totalTaka: isRefund ? -adjAmountTaka : adjAmountTaka,
        },
      ],
      subtotalTaka: isRefund ? -adjAmountTaka : adjAmountTaka,
      discountTaka: 0,
      totalTaka: isRefund ? -adjAmountTaka : adjAmountTaka,
      paidTaka: isRefund ? -adjAmountTaka : adjAmountTaka,
      dueTaka: 0,
      paymentMethod: dto.paymentMethod || 'cash',
      txnId: dto.txnId || undefined,
      notes: item.visit.consultationAdjustmentReason || undefined,
      createdAt: now,
    };

    const payload = {
      visitId,
      patientId: item.patient.id,
      billNumber,
      adjustmentType: adjType,
      amountTaka: adjAmountTaka,
      status: 'completed',
      currentLocation: 'reception',
      invoiceData,
    };

    this.gateway.emit('clinic:global', 'consultation.adjustment_processed', payload);
    this.gateway.emit('clinic:global', 'patient.routed', payload);
    this.gateway.emit('clinic:global', 'bill.created', { billNumber });
    this.realtime.publish('consultation.adjustment_processed', payload);
    this.realtime.publish('patient.routed', payload);
    this.realtime.publish('bill.created', { billNumber });

    return { ok: true, ...payload };
  }
}
