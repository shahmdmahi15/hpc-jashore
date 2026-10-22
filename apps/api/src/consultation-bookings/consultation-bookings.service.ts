// apps/api/src/consultation-bookings/consultation-bookings.service.ts
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
  consultationBookings,
  patients,
  rooms,
  sequences,
  serials,
  staff,
  users,
  visits,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import { computePunctuality, parseToldTimeToMinutes } from '../common/punctuality.util';
import type {
  CancelConsultationBookingDto,
  CreateConsultationBookingDto,
  ListConsultationBookingsQueryDto,
  SendToDoctorQueueDto,
} from './dto';

export interface Actor {
  sub: string;
  role: string;
}

export interface Meta {
  ip?: string | null;
  requestId?: string | null;
}

const todayDateString = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class ConsultationBookingsService {
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
        tx.insert(sequences)
          .values({
            scope: 'token',
            year,
            lastValue: 1,
          })
          .run();
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

  // --- List Bookings ---------------------------------------------------------
  async list(query: ListConsultationBookingsQueryDto) {
    const targetDate = query.date?.trim() || todayDateString();

    let baseQuery = this.db
      .select({
        booking: consultationBookings,
        patient: patients,
        doctor: staff,
        chamber: rooms,
      })
      .from(consultationBookings)
      .innerJoin(patients, eq(consultationBookings.patientId, patients.id))
      .innerJoin(staff, eq(consultationBookings.doctorId, staff.id))
      .leftJoin(rooms, eq(staff.chamberRoomId, rooms.id))
      .where(
        and(
          isNull(consultationBookings.deletedAt),
          query.date ? eq(consultationBookings.bookingDate, targetDate) : sql`1=1`,
          query.doctorId && query.doctorId !== 'all' ? eq(consultationBookings.doctorId, query.doctorId) : sql`1=1`,
          query.patientId ? eq(consultationBookings.patientId, query.patientId) : sql`1=1`,
          query.status && query.status !== 'all' ? eq(consultationBookings.status, query.status as any) : sql`1=1`,
        ),
      )
      .orderBy(consultationBookings.slotTime, desc(consultationBookings.createdAt));

    const rows = await baseQuery;

    let items = rows.map((r) => ({
      ...r.booking,
      feeTaka: Math.round((r.booking.feePaisa || 0) / 100),
      patient: {
        id: r.patient.id,
        mrn: r.patient.mrn,
        nameEn: r.patient.nameEn,
        nameBn: r.patient.nameBn,
        phone: r.patient.phone,
        gender: r.patient.gender,
        ageYears: r.patient.ageYears,
      },
      doctor: {
        id: r.doctor.id,
        fullName: r.doctor.fullName,
        specialization: r.doctor.specialization,
        qualifications: r.doctor.qualifications,
        chamberRoomNumber: r.chamber?.roomNumber ?? null,
        chamberName: r.chamber?.name ?? null,
        phone: r.doctor.phone,
      },
    }));

    if (query.search && query.search.trim()) {
      const q = query.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.patient.nameEn.toLowerCase().includes(q) ||
          (i.patient.nameBn && i.patient.nameBn.toLowerCase().includes(q)) ||
          i.patient.mrn.toLowerCase().includes(q) ||
          (i.patient.phone && i.patient.phone.includes(q)) ||
          i.bookingNumber.toLowerCase().includes(q) ||
          i.doctor.fullName.toLowerCase().includes(q),
      );
    }

    // Calculate Stats
    const stats = {
      totalBooked: items.length,
      checkedIn: items.filter((i) => i.status === 'checked_in').length,
      inQueue: items.filter((i) => i.status === 'in_queue' || i.status === 'in_chamber').length,
      completed: items.filter((i) => i.status === 'completed').length,
      cancelled: items.filter((i) => i.status === 'cancelled').length,
    };

    return { items, stats, date: targetDate };
  }

  // --- Get Doctor Available Slots ---------------------------------------------
  async getDoctorSlots(doctorId: string, dateStr: string) {
    const docRows = await this.db
      .select({
        doctor: staff,
        chamber: rooms,
      })
      .from(staff)
      .leftJoin(rooms, eq(staff.chamberRoomId, rooms.id))
      .where(eq(staff.id, doctorId));

    const doc = docRows[0];
    if (!doc) throw new NotFoundException('Doctor not found');

    const targetDate = dateStr?.trim() || todayDateString();
    const dateObj = new Date(targetDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[dateObj.getDay()];

    // Parse Doctor Config
    let availableDays: string[] = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    if (doc.doctor.availableDays) {
      try {
        availableDays = JSON.parse(doc.doctor.availableDays);
      } catch {}
    }

    const isAvailableDay = availableDays.includes(currentDayName);
    const slotDuration = doc.doctor.slotDurationMinutes || 15;
    const dailyQuota = doc.doctor.dailyQuota || 40;

    // Parse start and end time
    const startMinutes = parseToldTimeToMinutes(doc.doctor.dutyStartTime) ?? 9 * 60; // 09:00 AM default
    const endMinutes = parseToldTimeToMinutes(doc.doctor.dutyEndTime) ?? 17 * 60; // 05:00 PM default

    // Generate slots
    const generatedSlots: string[] = [];
    let cur = startMinutes;
    while (cur < endMinutes && generatedSlots.length < dailyQuota) {
      const hours = Math.floor(cur / 60);
      const mins = cur % 60;
      const meridiem = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 === 0 ? 12 : hours % 12;
      const slotString = `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${meridiem}`;
      generatedSlots.push(slotString);
      cur += slotDuration;
    }

    // Fetch existing bookings for this doctor on target date
    const existingBookings = await this.db
      .select({
        booking: consultationBookings,
        patient: patients,
      })
      .from(consultationBookings)
      .innerJoin(patients, eq(consultationBookings.patientId, patients.id))
      .where(
        and(
          eq(consultationBookings.doctorId, doctorId),
          eq(consultationBookings.bookingDate, targetDate),
          sql`${consultationBookings.status} != 'cancelled'`,
          isNull(consultationBookings.deletedAt),
        ),
      );

    const bookedSlotMap = new Map<string, any>();
    for (const b of existingBookings) {
      bookedSlotMap.set(b.booking.slotTime, {
        id: b.booking.id,
        bookingNumber: b.booking.bookingNumber,
        status: b.booking.status,
        patientName: b.patient.nameEn,
        mrn: b.patient.mrn,
      });
    }

    const slots = generatedSlots.map((time) => {
      const isBooked = bookedSlotMap.has(time);
      return {
        slotTime: time,
        isAvailable: !isBooked && isAvailableDay,
        booking: bookedSlotMap.get(time) || null,
      };
    });

    return {
      doctor: {
        id: doc.doctor.id,
        fullName: doc.doctor.fullName,
        specialization: doc.doctor.specialization,
        qualifications: doc.doctor.qualifications,
        chamber: doc.chamber?.name || `Chamber ${doc.chamber?.roomNumber || ''}`,
        consultationFeeTaka: Math.round((doc.doctor.consultationFeePaisa || 50000) / 100),
        followUpFeeTaka: Math.round((doc.doctor.followUpFeePaisa || 30000) / 100),
        reportFeeTaka: Math.round((doc.doctor.reportFeePaisa || 0) / 100),
      },
      isAvailableDay,
      targetDate,
      dayOfWeek: currentDayName,
      dutyStartTime: doc.doctor.dutyStartTime || '09:00 AM',
      dutyEndTime: doc.doctor.dutyEndTime || '05:00 PM',
      dailyQuota,
      bookedCount: existingBookings.length,
      availableCount: Math.max(0, dailyQuota - existingBookings.length),
      slots,
    };
  }

  // --- Create Booking --------------------------------------------------------
  async create(actor: Actor, dto: CreateConsultationBookingDto, meta: Meta) {
    // 1. Verify Patient
    const patientRows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId));
    let patient = patientRows[0];
    if (!patient) {
      // Lookup by MRN
      const byMrn = await this.db.select().from(patients).where(eq(patients.mrn, dto.patientId));
      if (!byMrn[0]) throw new NotFoundException('Patient not found');
      patient = byMrn[0];
    }

    // 2. Verify Doctor
    const docRows = await this.db.select().from(staff).where(eq(staff.id, dto.doctorId));
    const doctor = docRows[0];
    if (!doctor) throw new NotFoundException('Doctor not found');

    const targetDate = dto.bookingDate.trim();

    // 3. Check Daily Quota
    const existingForDoc = await this.db
      .select()
      .from(consultationBookings)
      .where(
        and(
          eq(consultationBookings.doctorId, dto.doctorId),
          eq(consultationBookings.bookingDate, targetDate),
          sql`${consultationBookings.status} != 'cancelled'`,
          isNull(consultationBookings.deletedAt),
        ),
      );

    const maxQuota = doctor.dailyQuota || 40;
    if (existingForDoc.length >= maxQuota) {
      throw new BadRequestException(
        `Doctor ${doctor.fullName} has reached the maximum daily quota (${maxQuota} patients) for ${targetDate}.`,
      );
    }

    // 4. Check Slot Collision
    const slotCollision = existingForDoc.find((b) => b.slotTime === dto.slotTime);
    if (slotCollision) {
      throw new BadRequestException(
        `Slot ${dto.slotTime} on ${targetDate} is already booked for this doctor.`,
      );
    }

    // 5. Calculate Fee
    let feePaisa: number;
    if (dto.feeTaka !== undefined) {
      feePaisa = dto.feeTaka * 100;
    } else if (dto.feePaisa !== undefined) {
      feePaisa = dto.feePaisa;
    } else {
      const visitType = dto.visitType || 'new_consultation';
      if (visitType === 'follow_up') {
        feePaisa = doctor.followUpFeePaisa ?? 30000;
      } else if (visitType === 'report_review') {
        feePaisa = doctor.reportFeePaisa ?? 0;
      } else {
        feePaisa = doctor.consultationFeePaisa ?? 50000;
      }
    }

    const bookingId = randomUUID();
    const dateFormatted = targetDate.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `DOC-${dateFormatted}-${randomSuffix}`;
    const now = new Date().toISOString();

    const newBookingRow = {
      id: bookingId,
      bookingNumber,
      patientId: patient.id,
      doctorId: doctor.id,
      bookingDate: targetDate,
      slotTime: dto.slotTime.trim(),
      toldTime: dto.toldTime?.trim() || dto.slotTime.trim(),
      visitType: dto.visitType || ('new_consultation' as const),
      feePaisa,
      serialNumber: null,
      status: 'booked' as const,
      checkedInAt: null,
      punctualityStatus: null,
      delayMinutes: null,
      inQueueAt: null,
      queuedBy: null,
      serialId: null,
      visitId: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      notes: dto.notes?.trim() ?? null,
      bookedBy: actor.sub,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(consultationBookings).values(newBookingRow);

    const created = {
      ...newBookingRow,
      feeTaka: Math.round(feePaisa / 100),
      patientName: patient.nameEn,
      patientPhone: patient.phone,
      doctorName: doctor.fullName,
    };

    // Broadcast realtime event
    this.gateway.emit('clinic:global', 'consultation.booked', created);
    this.realtime.publish('consultation.booked', created);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'consultation_booking.create',
      entity: 'consultation_bookings',
      entityId: bookingId,
      after: created,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return created;
  }

  // --- Check-in Booking ------------------------------------------------------
  async checkInBooking(
    actor: Actor,
    bookingId: string,
    toldTimeOverride?: string,
    notes?: string,
    meta?: Meta,
  ) {
    const rows = await this.db
      .select({
        booking: consultationBookings,
        patient: patients,
        doctor: staff,
      })
      .from(consultationBookings)
      .innerJoin(patients, eq(consultationBookings.patientId, patients.id))
      .innerJoin(staff, eq(consultationBookings.doctorId, staff.id))
      .where(eq(consultationBookings.id, bookingId));

    const item = rows[0];
    if (!item) throw new NotFoundException('Consultation booking not found');
    if (item.booking.status === 'cancelled') {
      throw new BadRequestException('Cannot check in a cancelled booking');
    }

    const now = new Date().toISOString();
    const today = todayDateString();
    const effectiveToldTime = toldTimeOverride?.trim() || item.booking.toldTime || item.booking.slotTime;
    const punctuality = effectiveToldTime ? computePunctuality(effectiveToldTime, new Date()) : null;

    // Put patient in the first available waiting room
    const waitingRooms = await this.db
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

    const firstWaitingRoom = waitingRooms[0] ?? null;
    const roomId = firstWaitingRoom?.id ?? null;
    const locationName = firstWaitingRoom?.name || 'Waiting Room';

    // Find or create visit
    let visitId = item.booking.visitId;
    let tokenNumber = 1;

    if (!visitId) {
      const year = new Date().getFullYear();
      tokenNumber = await this.nextTokenNumber(year);
      visitId = randomUUID();

      await this.db.insert(visits).values({
        id: visitId,
        patientId: item.patient.id,
        doctorId: item.doctor.id,
        tokenNumber,
        visitDate: today,
        status: 'checked_in',
        priority: 'normal',
        currentLocation: locationName,
        roomId,
        checkedInAt: now,
        checkedOutAt: null,
        toldTime: effectiveToldTime,
        punctualityStatus: punctuality?.punctualityStatus ?? null,
        delayMinutes: punctuality?.delayMinutes ?? null,
        consultationBookingId: bookingId,
        notes: notes ?? item.booking.notes ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update booking
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
      .where(eq(consultationBookings.id, bookingId));

    const updatedBooking = {
      ...item.booking,
      status: 'checked_in',
      checkedInAt: now,
      punctualityStatus: punctuality?.punctualityStatus ?? null,
      delayMinutes: punctuality?.delayMinutes ?? null,
      visitId,
      tokenNumber,
    };

    // Realtime events
    this.gateway.emit('clinic:global', 'consultation.checked_in', updatedBooking);
    this.gateway.emit('clinic:global', 'visit.checked_in', {
      visitId,
      patientId: item.patient.id,
      patientName: item.patient.nameEn,
      tokenNumber,
      currentLocation: locationName,
      punctualityStatus: punctuality?.punctualityStatus,
      delayMinutes: punctuality?.delayMinutes,
    });
    this.realtime.publish('consultation.checked_in', updatedBooking);

    if (meta) {
      await this.audit.log({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'consultation_booking.check_in',
        entity: 'consultation_bookings',
        entityId: bookingId,
        after: updatedBooking,
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    return updatedBooking;
  }

  // --- Send to Doctor Queue (Manual Action) -----------------------------------
  async sendToQueue(
    actor: Actor,
    bookingId: string,
    dto?: SendToDoctorQueueDto,
    meta?: Meta,
  ) {
    const rows = await this.db
      .select({
        booking: consultationBookings,
        patient: patients,
        doctor: staff,
        chamber: rooms,
      })
      .from(consultationBookings)
      .innerJoin(patients, eq(consultationBookings.patientId, patients.id))
      .innerJoin(staff, eq(consultationBookings.doctorId, staff.id))
      .leftJoin(rooms, eq(staff.chamberRoomId, rooms.id))
      .where(eq(consultationBookings.id, bookingId));

    const item = rows[0];
    if (!item) throw new NotFoundException('Consultation booking not found');

    if (item.booking.status === 'cancelled') {
      throw new BadRequestException('Cannot queue a cancelled booking');
    }
    if (item.booking.status === 'in_queue' || item.booking.status === 'in_chamber') {
      return item.booking; // already queued
    }

    // Auto-check in if not yet checked in
    let visitId = item.booking.visitId;
    if (!visitId || item.booking.status === 'booked') {
      const checkedIn = await this.checkInBooking(actor, bookingId, undefined, undefined, meta);
      visitId = checkedIn.visitId;
    }

    const today = item.booking.bookingDate || todayDateString();
    const now = new Date().toISOString();

    // Generate next serial number for this doctor today
    const priorSerials = await this.db
      .select()
      .from(serials)
      .where(and(eq(serials.doctorId, item.doctor.id), eq(serials.date, today)));

    const nextSerialNum = priorSerials.length + 1;
    const serialId = randomUUID();

    const serialRow = {
      id: serialId,
      doctorId: item.doctor.id,
      date: today,
      serialNumber: nextSerialNum,
      visitId: visitId!,
      patientId: item.patient.id,
      status: 'waiting' as const,
      calledAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(serials).values(serialRow);

    // Update Consultation Booking
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
      .where(eq(consultationBookings.id, bookingId));

    // Update Visit status
    await this.db
      .update(visits)
      .set({
        status: 'checked_in',
        doctorId: item.doctor.id,
        currentLocation: 'Waiting Room',
        updatedAt: now,
      })
      .where(eq(visits.id, visitId!));

    const queuedPayload = {
      bookingId,
      serialId,
      serialNumber: nextSerialNum,
      patientId: item.patient.id,
      patientName: item.patient.nameEn,
      doctorId: item.doctor.id,
      doctorName: item.doctor.fullName,
      chamber: item.chamber?.name || `Chamber ${item.chamber?.roomNumber || ''}`,
      status: 'in_queue',
      inQueueAt: now,
    };

    // Realtime events
    this.gateway.emit('clinic:global', 'consultation.queued', queuedPayload);
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: item.doctor.id });
    this.gateway.emit('clinic:global', 'doctor.queue.updated', queuedPayload);
    this.realtime.publish('consultation.queued', queuedPayload);

    if (meta) {
      await this.audit.log({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'consultation_booking.queue',
        entity: 'consultation_bookings',
        entityId: bookingId,
        after: queuedPayload,
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    return queuedPayload;
  }

  // --- Cancel Booking --------------------------------------------------------
  async cancel(
    actor: Actor,
    bookingId: string,
    dto?: CancelConsultationBookingDto,
    meta?: Meta,
  ) {
    const rows = await this.db
      .select()
      .from(consultationBookings)
      .where(eq(consultationBookings.id, bookingId));
    const booking = rows[0];
    if (!booking) throw new NotFoundException('Consultation booking not found');

    const now = new Date().toISOString();

    // If already in serials queue, mark serial as skipped
    if (booking.serialId) {
      await this.db
        .update(serials)
        .set({ status: 'skipped', completedAt: now, updatedAt: now })
        .where(eq(serials.id, booking.serialId));
    }

    // If visit exists and is checked_in, mark visit as cancelled
    if (booking.visitId) {
      await this.db
        .update(visits)
        .set({ status: 'cancelled', updatedAt: now })
        .where(eq(visits.id, booking.visitId));
    }

    await this.db
      .update(consultationBookings)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: actor.sub,
        cancellationReason: dto?.reason?.trim() ?? 'Cancelled by user',
        updatedAt: now,
      })
      .where(eq(consultationBookings.id, bookingId));

    const cancelledPayload = {
      bookingId,
      status: 'cancelled',
      doctorId: booking.doctorId,
      cancelledAt: now,
    };

    this.gateway.emit('clinic:global', 'consultation.cancelled', cancelledPayload);
    this.gateway.emit('clinic:global', 'queue.updated', { doctorId: booking.doctorId });
    this.realtime.publish('consultation.cancelled', cancelledPayload);

    if (meta) {
      await this.audit.log({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'consultation_booking.cancel',
        entity: 'consultation_bookings',
        entityId: bookingId,
        after: cancelledPayload,
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    return cancelledPayload;
  }
}
