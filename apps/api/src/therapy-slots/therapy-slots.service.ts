import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { therapySlotConfigs, type DayOfWeek } from '../db/schema';
import type {
  BulkUpdateTherapySlotsDto,
  CopyDayScheduleDto,
  TherapySlotQueryDto,
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

@Injectable()
export class TherapySlotsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
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
}
