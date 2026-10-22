import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  patients,
  therapySlotBookings,
  therapySlotConfigs,
  users,
  visits,
  type DayOfWeek,
  type SlotHour,
  type TherapyBookingStatus,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  BulkUpdateTherapySlotsDto,
  CopyDayScheduleDto,
  CreateTherapyBookingDto,
  TherapyBookingQueryDto,
  TherapySlotQueryDto,
  UpdateTherapyBookingDto,
  UpdateTherapySlotDto,
} from './dto';

interface Actor {
  sub: string;
  role: string;
}

interface Meta {
  ip?: string | null;
  requestId?: string | null;
}

function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayIndex = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const DAYS: DayOfWeek[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return DAYS[dayIndex] || 'Sunday';
}

@Injectable()
export class TherapySlotsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly gateway: EventsGateway,
    private readonly realtime: RealtimeService,
  ) {}

  async list(dto: TherapySlotQueryDto) {
    const conditions = [];

    if (dto.day) {
      conditions.push(eq(therapySlotConfigs.day, dto.day));
    }

    if (dto.isActive !== undefined && dto.isActive !== '') {
      const activeVal =
        dto.isActive === true || dto.isActive === 'true' || dto.isActive === 1 || dto.isActive === '1'
          ? 1
          : 0;
      conditions.push(eq(therapySlotConfigs.isActive, activeVal));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db
      .select()
      .from(therapySlotConfigs)
      .where(whereClause)
      .orderBy(asc(therapySlotConfigs.day), asc(therapySlotConfigs.slotOrder));

    // Summary stats calculation
    let totalSlots = items.length;
    let activeSlots = 0;
    let totalMaleRegularCapacity = 0;
    let totalFemaleRegularCapacity = 0;
    let totalMaleExtraCapacity = 0;
    let totalFemaleExtraCapacity = 0;

    for (const item of items) {
      if (item.isActive === 1) {
        activeSlots++;
        totalMaleRegularCapacity += item.slotMaleRegularCapacity;
        totalFemaleRegularCapacity += item.slotFemaleRegularCapacity;
        totalMaleExtraCapacity += item.slotMaleExtraCapacity;
        totalFemaleExtraCapacity += item.slotFemaleExtraCapacity;
      }
    }

    const totalRegularCapacity = totalMaleRegularCapacity + totalFemaleRegularCapacity;
    const totalExtraCapacity = totalMaleExtraCapacity + totalFemaleExtraCapacity;
    const grandTotalCapacity = totalRegularCapacity + totalExtraCapacity;

    const stats = {
      totalSlots,
      activeSlots,
      totalMaleRegularCapacity,
      totalFemaleRegularCapacity,
      totalMaleExtraCapacity,
      totalFemaleExtraCapacity,
      totalRegularCapacity,
      totalExtraCapacity,
      grandTotalCapacity,
    };

    return {
      items,
      stats,
    };
  }

  async get(id: string) {
    const rows = await this.db
      .select()
      .from(therapySlotConfigs)
      .where(eq(therapySlotConfigs.id, id));

    if (!rows[0]) throw new NotFoundException('Therapy slot configuration not found');
    return rows[0];
  }

  async update(actor: Actor, id: string, dto: UpdateTherapySlotDto, meta: Meta) {
    const existing = await this.get(id);

    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.slotMaleRegularCapacity !== undefined) {
      updatePayload.slotMaleRegularCapacity = dto.slotMaleRegularCapacity;
    }
    if (dto.slotFemaleRegularCapacity !== undefined) {
      updatePayload.slotFemaleRegularCapacity = dto.slotFemaleRegularCapacity;
    }
    if (dto.slotMaleExtraCapacity !== undefined) {
      updatePayload.slotMaleExtraCapacity = dto.slotMaleExtraCapacity;
    }
    if (dto.slotFemaleExtraCapacity !== undefined) {
      updatePayload.slotFemaleExtraCapacity = dto.slotFemaleExtraCapacity;
    }
    if (dto.isActive !== undefined) {
      updatePayload.isActive = dto.isActive;
    }
    if (dto.notes !== undefined) {
      updatePayload.notes = dto.notes ? dto.notes.trim() : null;
    }

    await this.db
      .update(therapySlotConfigs)
      .set(updatePayload)
      .where(eq(therapySlotConfigs.id, id));

    const updated = await this.get(id);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_slot.update',
      entity: 'therapy_slot_configs',
      entityId: id,
      before: {
        day: existing.day,
        slotHour: existing.slotHour,
        maleReg: existing.slotMaleRegularCapacity,
        femaleReg: existing.slotFemaleRegularCapacity,
        maleExtra: existing.slotMaleExtraCapacity,
        femaleExtra: existing.slotFemaleExtraCapacity,
        isActive: existing.isActive,
      },
      after: {
        day: updated.day,
        slotHour: updated.slotHour,
        maleReg: updated.slotMaleRegularCapacity,
        femaleReg: updated.slotFemaleRegularCapacity,
        maleExtra: updated.slotMaleExtraCapacity,
        femaleExtra: updated.slotFemaleExtraCapacity,
        isActive: updated.isActive,
      },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return updated;
  }

  async bulkUpdate(actor: Actor, dto: BulkUpdateTherapySlotsDto, meta: Meta) {
    const updatedIds: string[] = [];

    for (const item of dto.slots) {
      const updatePayload: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };
      if (item.slotMaleRegularCapacity !== undefined) {
        updatePayload.slotMaleRegularCapacity = item.slotMaleRegularCapacity;
      }
      if (item.slotFemaleRegularCapacity !== undefined) {
        updatePayload.slotFemaleRegularCapacity = item.slotFemaleRegularCapacity;
      }
      if (item.slotMaleExtraCapacity !== undefined) {
        updatePayload.slotMaleExtraCapacity = item.slotMaleExtraCapacity;
      }
      if (item.slotFemaleExtraCapacity !== undefined) {
        updatePayload.slotFemaleExtraCapacity = item.slotFemaleExtraCapacity;
      }
      if (item.isActive !== undefined) {
        updatePayload.isActive = item.isActive;
      }
      if (item.notes !== undefined) {
        updatePayload.notes = item.notes ? item.notes.trim() : null;
      }

      await this.db
        .update(therapySlotConfigs)
        .set(updatePayload)
        .where(eq(therapySlotConfigs.id, item.id));

      updatedIds.push(item.id);
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_slot.bulk_update',
      entity: 'therapy_slot_configs',
      entityId: 'bulk',
      after: { count: updatedIds.length, ids: updatedIds },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { success: true, count: updatedIds.length };
  }

  async copyDaySchedule(actor: Actor, dto: CopyDayScheduleDto, meta: Meta) {
    const sourceSlots = await this.db
      .select()
      .from(therapySlotConfigs)
      .where(eq(therapySlotConfigs.day, dto.fromDay))
      .orderBy(asc(therapySlotConfigs.slotOrder));

    let updatedCount = 0;

    for (const targetDay of dto.toDays) {
      if (targetDay === dto.fromDay) continue;

      for (const src of sourceSlots) {
        await this.db
          .update(therapySlotConfigs)
          .set({
            slotMaleRegularCapacity: src.slotMaleRegularCapacity,
            slotFemaleRegularCapacity: src.slotFemaleRegularCapacity,
            slotMaleExtraCapacity: src.slotMaleExtraCapacity,
            slotFemaleExtraCapacity: src.slotFemaleExtraCapacity,
            isActive: src.isActive,
            notes: src.notes,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(therapySlotConfigs.day, targetDay),
              eq(therapySlotConfigs.slotHour, src.slotHour),
            ),
          );
        updatedCount++;
      }
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_slot.copy_day',
      entity: 'therapy_slot_configs',
      entityId: dto.fromDay,
      after: {
        fromDay: dto.fromDay,
        toDays: dto.toDays,
        slotsUpdated: updatedCount,
      },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { success: true, updatedCount };
  }

  // --- Therapy Slot Availability & Realtime Capacity --------------------------

  async getAvailability(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }

    const dayOfWeek = getDayOfWeekFromDate(date);

    // Fetch slot configs for this day
    const configs = await this.db
      .select()
      .from(therapySlotConfigs)
      .where(eq(therapySlotConfigs.day, dayOfWeek))
      .orderBy(asc(therapySlotConfigs.slotOrder));

    // Fetch active bookings for this date (not cancelled, not deleted)
    const activeBookings = await this.db
      .select({
        id: therapySlotBookings.id,
        slotHour: therapySlotBookings.slotHour,
        patientGender: therapySlotBookings.patientGender,
        capacityType: therapySlotBookings.capacityType,
        status: therapySlotBookings.status,
      })
      .from(therapySlotBookings)
      .where(
        and(
          eq(therapySlotBookings.bookingDate, date),
          isNull(therapySlotBookings.deletedAt),
          sql`${therapySlotBookings.status} != 'cancelled'`,
        ),
      );

    let totalDayRegularCapacity = 0;
    let totalDayExtraCapacity = 0;
    let totalDayBooked = 0;
    let totalMaleBooked = 0;
    let totalFemaleBooked = 0;
    let activeSlotsCount = 0;

    const slotAvailabilities = configs.map((cfg) => {
      const slotBookings = activeBookings.filter((b) => b.slotHour === cfg.slotHour);

      const maleRegularBooked = slotBookings.filter(
        (b) => b.patientGender === 'male' && b.capacityType === 'regular',
      ).length;
      const maleExtraBooked = slotBookings.filter(
        (b) => b.patientGender === 'male' && b.capacityType === 'extra',
      ).length;
      const femaleRegularBooked = slotBookings.filter(
        (b) => b.patientGender === 'female' && b.capacityType === 'regular',
      ).length;
      const femaleExtraBooked = slotBookings.filter(
        (b) => b.patientGender === 'female' && b.capacityType === 'extra',
      ).length;

      const maleRegularRemaining = Math.max(0, cfg.slotMaleRegularCapacity - maleRegularBooked);
      const femaleRegularRemaining = Math.max(0, cfg.slotFemaleRegularCapacity - femaleRegularBooked);
      const maleExtraRemaining = Math.max(0, cfg.slotMaleExtraCapacity - maleExtraBooked);
      const femaleExtraRemaining = Math.max(0, cfg.slotFemaleExtraCapacity - femaleExtraBooked);

      const maleTotalAvailable = maleRegularRemaining + maleExtraRemaining;
      const femaleTotalAvailable = femaleRegularRemaining + femaleExtraRemaining;

      const totalSlotBooked =
        maleRegularBooked + maleExtraBooked + femaleRegularBooked + femaleExtraBooked;
      const totalSlotRegularCapacity = cfg.slotMaleRegularCapacity + cfg.slotFemaleRegularCapacity;
      const totalSlotExtraCapacity = cfg.slotMaleExtraCapacity + cfg.slotFemaleExtraCapacity;
      const totalSlotCapacity = totalSlotRegularCapacity + totalSlotExtraCapacity;

      if (cfg.isActive === 1) {
        activeSlotsCount++;
        totalDayRegularCapacity += totalSlotRegularCapacity;
        totalDayExtraCapacity += totalSlotExtraCapacity;
        totalDayBooked += totalSlotBooked;
        totalMaleBooked += maleRegularBooked + maleExtraBooked;
        totalFemaleBooked += femaleRegularBooked + femaleExtraBooked;
      }

      const isMaleFull = maleTotalAvailable === 0;
      const isFemaleFull = femaleTotalAvailable === 0;
      const isSlotFull = isMaleFull && isFemaleFull;

      return {
        id: cfg.id,
        day: cfg.day,
        slotHour: cfg.slotHour,
        slotOrder: cfg.slotOrder,
        isActive: cfg.isActive,
        notes: cfg.notes,
        // Male capacities
        maleRegularCapacity: cfg.slotMaleRegularCapacity,
        maleRegularBooked,
        maleRegularRemaining,
        maleExtraCapacity: cfg.slotMaleExtraCapacity,
        maleExtraBooked,
        maleExtraRemaining,
        maleTotalAvailable,
        isMaleFull,
        // Female capacities
        femaleRegularCapacity: cfg.slotFemaleRegularCapacity,
        femaleRegularBooked,
        femaleRegularRemaining,
        femaleExtraCapacity: cfg.slotFemaleExtraCapacity,
        femaleExtraBooked,
        femaleExtraRemaining,
        femaleTotalAvailable,
        isFemaleFull,
        // Combined slot numbers
        totalSlotBooked,
        totalSlotCapacity,
        totalSlotAvailable: maleTotalAvailable + femaleTotalAvailable,
        isSlotFull,
        isOpen: cfg.isActive === 1 && !isSlotFull,
      };
    });

    const totalDayCapacity = totalDayRegularCapacity + totalDayExtraCapacity;
    const utilizationPercent =
      totalDayCapacity > 0 ? Math.round((totalDayBooked / totalDayCapacity) * 100) : 0;

    return {
      date,
      dayOfWeek,
      stats: {
        totalDayCapacity,
        totalDayRegularCapacity,
        totalDayExtraCapacity,
        totalDayBooked,
        totalMaleBooked,
        totalFemaleBooked,
        activeSlotsCount,
        utilizationPercent,
      },
      slots: slotAvailabilities,
    };
  }

  // --- Therapy Slot Bookings CRUD --------------------------------------------

  async createBooking(actor: Actor, dto: CreateTherapyBookingDto, meta: Meta) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.bookingDate)) {
      throw new BadRequestException('Booking date must be in YYYY-MM-DD format');
    }

    // 1. Validate Patient
    const patientRows = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.id, dto.patientId), isNull(patients.deletedAt)));
    const patient = patientRows[0];
    if (!patient) throw new NotFoundException('Patient not found');

    const gender = patient.gender; // 'male' | 'female'
    const dayOfWeek = getDayOfWeekFromDate(dto.bookingDate);

    // 2. Validate Slot Config
    const slotConfigRows = await this.db
      .select()
      .from(therapySlotConfigs)
      .where(
        and(
          eq(therapySlotConfigs.day, dayOfWeek),
          eq(therapySlotConfigs.slotHour, dto.slotHour),
        ),
      );
    const config = slotConfigRows[0];
    if (!config || config.isActive === 0) {
      throw new BadRequestException(
        `Therapy slot ${dto.slotHour} is closed/inactive on ${dayOfWeek}`,
      );
    }

    // 3. Capacity Check for patient gender
    const existingBookings = await this.db
      .select({
        id: therapySlotBookings.id,
        capacityType: therapySlotBookings.capacityType,
      })
      .from(therapySlotBookings)
      .where(
        and(
          eq(therapySlotBookings.bookingDate, dto.bookingDate),
          eq(therapySlotBookings.slotHour, dto.slotHour),
          eq(therapySlotBookings.patientGender, gender),
          isNull(therapySlotBookings.deletedAt),
          sql`${therapySlotBookings.status} != 'cancelled'`,
        ),
      );

    const regCap =
      gender === 'male'
        ? config.slotMaleRegularCapacity
        : config.slotFemaleRegularCapacity;
    const extraCap =
      gender === 'male'
        ? config.slotMaleExtraCapacity
        : config.slotFemaleExtraCapacity;

    const regularBookedCount = existingBookings.filter((b) => b.capacityType === 'regular').length;
    const extraBookedCount = existingBookings.filter((b) => b.capacityType === 'extra').length;

    let assignedCapacityType: 'regular' | 'extra';
    if (dto.capacityType === 'extra') {
      if (extraBookedCount < extraCap) {
        assignedCapacityType = 'extra';
      } else {
        throw new ConflictException(
          `No extra capacity left for ${gender} patients in slot ${dto.slotHour} on ${dto.bookingDate} (${dayOfWeek}). Extra capacity is fully booked (${extraBookedCount}/${extraCap}).`,
        );
      }
    } else if (regularBookedCount < regCap) {
      assignedCapacityType = 'regular';
    } else if (extraBookedCount < extraCap) {
      assignedCapacityType = 'extra';
    } else {
      throw new ConflictException(
        `No capacity left for ${gender} patients in slot ${dto.slotHour} on ${dto.bookingDate} (${dayOfWeek}). Slot is fully booked.`,
      );
    }

    // 4. Generate Booking Number
    const dateClean = dto.bookingDate.replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `TSB-${dateClean}-${randSuffix}`;

    const id = randomUUID();
    const now = new Date().toISOString();
    const isExtra = assignedCapacityType === 'extra';

    const newBooking = {
      id,
      bookingNumber,
      patientId: dto.patientId,
      bookingDate: dto.bookingDate,
      dayOfWeek,
      slotHour: dto.slotHour,
      toldTime: dto.toldTime ? dto.toldTime.trim() : null,
      patientGender: gender,
      capacityType: assignedCapacityType,
      status: isExtra ? ('booked' as const) : ('confirmed' as const),
      approvalStatus: isExtra ? ('pending' as const) : ('approved' as const),
      approvedBy: isExtra ? null : actor.sub,
      approvedAt: isExtra ? null : now,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      notes: dto.notes ? dto.notes.trim() : null,
      bookedBy: actor.sub,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(therapySlotBookings).values(newBooking);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_booking.create',
      entity: 'therapy_slot_bookings',
      entityId: id,
      after: newBooking,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    const result = await this.getBooking(id);
    this.gateway.emit('clinic:global', 'therapy.booking.created', result);
    this.gateway.emit('clinic:global', 'therapy.slot.updated', {
      slotHour: dto.slotHour,
      date: dto.bookingDate,
      isExtra,
    });
    this.realtime.publish('therapy.booking.created', result);

    return result;
  }

  async listBookings(dto: TherapyBookingQueryDto) {
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(200, Math.max(1, dto.limit ?? 50));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (dto.status === 'cancelled') {
      conditions.push(
        or(
          eq(therapySlotBookings.status, 'cancelled'),
          sql`${therapySlotBookings.deletedAt} IS NOT NULL`,
        )!,
      );
    } else if (dto.status && dto.status !== 'all') {
      conditions.push(eq(therapySlotBookings.status, dto.status as TherapyBookingStatus));
      conditions.push(isNull(therapySlotBookings.deletedAt));
    } else {
      conditions.push(isNull(therapySlotBookings.deletedAt));
      conditions.push(sql`${therapySlotBookings.status} != 'cancelled'`);
    }

    if (dto.date && dto.date.trim()) {
      conditions.push(eq(therapySlotBookings.bookingDate, dto.date.trim()));
    }

    if (dto.patientId && dto.patientId.trim()) {
      conditions.push(eq(therapySlotBookings.patientId, dto.patientId.trim()));
    }

    if (dto.slotHour && dto.slotHour !== 'all') {
      conditions.push(eq(therapySlotBookings.slotHour, dto.slotHour as SlotHour));
    }

    if (dto.capacityType) {
      conditions.push(eq(therapySlotBookings.capacityType, dto.capacityType));
    }

    if (dto.approvalStatus && dto.approvalStatus !== 'all') {
      conditions.push(eq(therapySlotBookings.approvalStatus, dto.approvalStatus));
    }

    if (dto.query && dto.query.trim()) {
      const pattern = `%${dto.query.trim()}%`;
      conditions.push(
        or(
          like(therapySlotBookings.bookingNumber, pattern),
          like(patients.nameEn, pattern),
          like(patients.nameBn, pattern),
          like(patients.mrn, pattern),
          like(patients.phone, pattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const rows = await this.db
      .select({
        id: therapySlotBookings.id,
        bookingNumber: therapySlotBookings.bookingNumber,
        patientId: therapySlotBookings.patientId,
        bookingDate: therapySlotBookings.bookingDate,
        dayOfWeek: therapySlotBookings.dayOfWeek,
        slotHour: therapySlotBookings.slotHour,
        toldTime: therapySlotBookings.toldTime,
        patientGender: therapySlotBookings.patientGender,
        capacityType: therapySlotBookings.capacityType,
        status: therapySlotBookings.status,
        approvalStatus: therapySlotBookings.approvalStatus,
        approvedBy: therapySlotBookings.approvedBy,
        approvedAt: therapySlotBookings.approvedAt,
        rejectedBy: therapySlotBookings.rejectedBy,
        rejectedAt: therapySlotBookings.rejectedAt,
        rejectionReason: therapySlotBookings.rejectionReason,
        notes: therapySlotBookings.notes,
        bookedBy: therapySlotBookings.bookedBy,
        createdAt: therapySlotBookings.createdAt,
        updatedAt: therapySlotBookings.updatedAt,
        patient: {
          id: patients.id,
          mrn: patients.mrn,
          nameEn: patients.nameEn,
          nameBn: patients.nameBn,
          phone: patients.phone,
          email: patients.email,
          gender: patients.gender,
          ageYears: patients.ageYears,
          bloodGroup: patients.bloodGroup,
        },
        bookedByUser: {
          id: users.id,
          displayName: users.displayName,
          role: users.role,
        },
      })
      .from(therapySlotBookings)
      .innerJoin(patients, eq(therapySlotBookings.patientId, patients.id))
      .leftJoin(users, eq(therapySlotBookings.bookedBy, users.id))
      .where(whereClause)
      .orderBy(
        asc(therapySlotBookings.bookingDate),
        asc(therapySlotBookings.slotHour),
        desc(therapySlotBookings.createdAt),
      )
      .limit(limit)
      .offset(offset);

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(therapySlotBookings)
      .innerJoin(patients, eq(therapySlotBookings.patientId, patients.id))
      .where(whereClause);

    const total = Number(totalResult[0]?.count ?? 0);

    // Date-specific or overall stats calculation
    const baseStatsConditions = [];
    if (dto.date && dto.date.trim()) {
      baseStatsConditions.push(eq(therapySlotBookings.bookingDate, dto.date.trim()));
    }

    const allBookingsForStats = await this.db
      .select({
        status: therapySlotBookings.status,
        deletedAt: therapySlotBookings.deletedAt,
      })
      .from(therapySlotBookings)
      .where(baseStatsConditions.length > 0 ? and(...baseStatsConditions) : undefined);

    const stats = {
      total: allBookingsForStats.filter((b) => b.status !== 'cancelled' && !b.deletedAt).length,
      booked: allBookingsForStats.filter((b) => b.status === 'booked' && !b.deletedAt).length,
      confirmed: allBookingsForStats.filter((b) => b.status === 'confirmed' && !b.deletedAt).length,
      attended: allBookingsForStats.filter((b) => b.status === 'attended' && !b.deletedAt).length,
      completed: allBookingsForStats.filter((b) => b.status === 'completed' && !b.deletedAt).length,
      cancelled: allBookingsForStats.filter((b) => b.status === 'cancelled' || !!b.deletedAt).length,
    };

    return {
      items: rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats,
    };
  }

  async getBooking(id: string, includeDeleted = false) {
    const rows = await this.db
      .select({
        id: therapySlotBookings.id,
        bookingNumber: therapySlotBookings.bookingNumber,
        patientId: therapySlotBookings.patientId,
        bookingDate: therapySlotBookings.bookingDate,
        dayOfWeek: therapySlotBookings.dayOfWeek,
        slotHour: therapySlotBookings.slotHour,
        toldTime: therapySlotBookings.toldTime,
        patientGender: therapySlotBookings.patientGender,
        capacityType: therapySlotBookings.capacityType,
        status: therapySlotBookings.status,
        approvalStatus: therapySlotBookings.approvalStatus,
        approvedBy: therapySlotBookings.approvedBy,
        approvedAt: therapySlotBookings.approvedAt,
        rejectedBy: therapySlotBookings.rejectedBy,
        rejectedAt: therapySlotBookings.rejectedAt,
        rejectionReason: therapySlotBookings.rejectionReason,
        notes: therapySlotBookings.notes,
        bookedBy: therapySlotBookings.bookedBy,
        createdAt: therapySlotBookings.createdAt,
        updatedAt: therapySlotBookings.updatedAt,
        patient: {
          id: patients.id,
          mrn: patients.mrn,
          nameEn: patients.nameEn,
          nameBn: patients.nameBn,
          phone: patients.phone,
          email: patients.email,
          gender: patients.gender,
          ageYears: patients.ageYears,
          bloodGroup: patients.bloodGroup,
        },
        bookedByUser: {
          id: users.id,
          displayName: users.displayName,
          role: users.role,
        },
      })
      .from(therapySlotBookings)
      .innerJoin(patients, eq(therapySlotBookings.patientId, patients.id))
      .leftJoin(users, eq(therapySlotBookings.bookedBy, users.id))
      .where(and(eq(therapySlotBookings.id, id), includeDeleted ? sql`1=1` : isNull(therapySlotBookings.deletedAt)));

    if (!rows[0]) throw new NotFoundException('Therapy slot booking not found');
    return rows[0];
  }

  async updateBooking(
    actor: Actor,
    id: string,
    dto: UpdateTherapyBookingDto,
    meta: Meta,
  ) {
    const existing = await this.getBooking(id, true);

    const patch: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.status !== undefined) {
      patch.status = dto.status;
      if (dto.status === 'cancelled') {
        patch.deletedAt = new Date().toISOString();
      } else {
        patch.deletedAt = null;
      }
    }
    if (dto.toldTime !== undefined) {
      patch.toldTime = dto.toldTime ? dto.toldTime.trim() : null;
    }
    if (dto.notes !== undefined) {
      patch.notes = dto.notes ? dto.notes.trim() : null;
    }
    if (dto.bookingDate !== undefined && dto.bookingDate.trim()) {
      patch.bookingDate = dto.bookingDate.trim();
      patch.dayOfWeek = getDayOfWeekFromDate(dto.bookingDate.trim());
    }
    if (dto.slotHour !== undefined) {
      patch.slotHour = dto.slotHour;
    }

    await this.db
      .update(therapySlotBookings)
      .set(patch)
      .where(eq(therapySlotBookings.id, id));

    const updated = await this.getBooking(id, true);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_booking.update',
      entity: 'therapy_slot_bookings',
      entityId: id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return updated;
  }

  async approveBooking(actor: Actor, id: string, meta: Meta) {
    const existing = await this.getBooking(id, true);

    const now = new Date().toISOString();
    await this.db
      .update(therapySlotBookings)
      .set({
        approvalStatus: 'approved',
        status: 'confirmed',
        approvedBy: actor.sub,
        approvedAt: now,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        updatedAt: now,
      })
      .where(eq(therapySlotBookings.id, id));

    const updated = await this.getBooking(id, true);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_booking.approve',
      entity: 'therapy_slot_bookings',
      entityId: id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    this.gateway.emit('clinic:global', 'therapy.booking.approved', updated);
    this.gateway.emit('clinic:global', 'therapy.slot.updated', { bookingId: id });
    this.realtime.publish('therapy.booking.approved', updated);

    return updated;
  }

  async rejectBooking(actor: Actor, id: string, reason: string, meta: Meta) {
    const existing = await this.getBooking(id, true);

    if (!reason || !reason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const now = new Date().toISOString();
    await this.db
      .update(therapySlotBookings)
      .set({
        approvalStatus: 'rejected',
        status: 'cancelled',
        rejectedBy: actor.sub,
        rejectedAt: now,
        rejectionReason: reason.trim(),
        updatedAt: now,
      })
      .where(eq(therapySlotBookings.id, id));

    // Cancel any linked visits where therapyBookingId = id and status = 'checked_in'
    const linkedVisits = await this.db
      .select({ id: visits.id, patientId: visits.patientId, tokenNumber: visits.tokenNumber })
      .from(visits)
      .where(and(eq(visits.therapyBookingId, id), eq(visits.status, 'checked_in')));

    if (linkedVisits.length > 0) {
      await this.db
        .update(visits)
        .set({ status: 'cancelled', updatedAt: now })
        .where(and(eq(visits.therapyBookingId, id), eq(visits.status, 'checked_in')));

      for (const v of linkedVisits) {
        this.gateway.emit('clinic:global', 'therapy.queue.updated', {
          visitId: v.id,
          patientId: v.patientId,
          tokenNumber: v.tokenNumber,
          cancelled: true,
        });
      }
    }

    const updated = await this.getBooking(id, true);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_booking.reject',
      entity: 'therapy_slot_bookings',
      entityId: id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    this.gateway.emit('clinic:global', 'therapy.booking.rejected', updated);
    this.gateway.emit('clinic:global', 'therapy.slot.updated', { bookingId: id });
    this.realtime.publish('therapy.booking.rejected', updated);

    return updated;
  }

  async deleteBooking(actor: Actor, id: string, meta: Meta) {
    const existing = await this.getBooking(id, true);

    const now = new Date().toISOString();
    await this.db
      .update(therapySlotBookings)
      .set({
        deletedAt: now,
        status: 'cancelled',
        updatedAt: now,
      })
      .where(eq(therapySlotBookings.id, id));

    // If the patient already checked in with this therapy booking, cancel the visit and remove them from the queue
    const linkedVisits = await this.db
      .select({ id: visits.id, patientId: visits.patientId, tokenNumber: visits.tokenNumber })
      .from(visits)
      .where(and(eq(visits.therapyBookingId, id), eq(visits.status, 'checked_in')));

    if (linkedVisits.length > 0) {
      await this.db
        .update(visits)
        .set({ status: 'cancelled', therapyBookingId: null, updatedAt: now })
        .where(and(eq(visits.therapyBookingId, id), eq(visits.status, 'checked_in')));

      for (const v of linkedVisits) {
        const queuePayload = {
          visitId: v.id,
          patientId: v.patientId,
          tokenNumber: v.tokenNumber,
          cancelled: true,
        };
        this.gateway.emit('clinic:global', 'therapy.queue.updated', queuePayload);
        this.realtime.publish('therapy.queue.updated', queuePayload);
      }
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_booking.delete',
      entity: 'therapy_slot_bookings',
      entityId: id,
      before: existing,
      after: { deletedAt: now, status: 'cancelled' },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    const slotPayload = { bookingId: id, patientId: existing.patientId, cancelled: true };
    this.gateway.emit('clinic:global', 'therapy.slot.updated', slotPayload);
    this.gateway.emit('clinic:global', 'therapy.booking.cancelled', slotPayload);
    this.realtime.publish('therapy.slot.updated', slotPayload);
    this.realtime.publish('therapy.booking.cancelled', slotPayload);

    return { success: true };
  }

  async restoreBooking(actor: Actor, id: string, meta: Meta) {
    const existing = await this.getBooking(id, true);

    const now = new Date().toISOString();
    await this.db
      .update(therapySlotBookings)
      .set({
        deletedAt: null,
        status: 'confirmed',
        updatedAt: now,
      })
      .where(eq(therapySlotBookings.id, id));

    const updated = await this.getBooking(id);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'therapy_booking.restore',
      entity: 'therapy_slot_bookings',
      entityId: id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return updated;
  }
}
