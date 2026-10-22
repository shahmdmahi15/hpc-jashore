import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { rooms, type RoomGender, type RoomStatus, type RoomType } from '../db/schema';
import type { CreateRoomDto, RoomQueryDto, UpdateRoomDto } from './dto';

interface Actor {
  sub: string;
  role: string;
}

interface Meta {
  ip?: string | null;
  requestId?: string | null;
}

@Injectable()
export class RoomsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async search(dto: RoomQueryDto) {
    try {
      const page = Math.max(1, dto.page ?? 1);
      const limit = Math.min(100, Math.max(1, dto.limit ?? 50));
      const offset = (page - 1) * limit;

      const conditions = [isNull(rooms.deletedAt)];

      if (dto.query && dto.query.trim()) {
        const pattern = `%${dto.query.trim()}%`;
        conditions.push(
          or(
            like(rooms.roomNumber, pattern),
            like(rooms.name, pattern),
            like(rooms.notes, pattern),
          )!,
        );
      }

      if (dto.type && dto.type !== 'all') {
        conditions.push(eq(rooms.type, dto.type as RoomType));
      }

      if (dto.gender && dto.gender !== 'all') {
        conditions.push(eq(rooms.gender, dto.gender as RoomGender));
      }

      if (dto.status && dto.status !== 'all') {
        conditions.push(eq(rooms.status, dto.status as RoomStatus));
      }

      const whereClause = and(...conditions);

      // Fetch items with pagination
      const items = await this.db
        .select()
        .from(rooms)
        .where(whereClause)
        .orderBy(rooms.roomNumber)
        .limit(limit)
        .offset(offset);

      // Total count for current query
      const totalRow = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(rooms)
        .where(whereClause);
      const total = Number(totalRow[0]?.count ?? 0);

      // Global room stats for KPI ribbon (all non-deleted rooms)
      const allActiveRooms = await this.db
        .select({
          status: rooms.status,
          capacity: rooms.capacity,
        })
        .from(rooms)
        .where(isNull(rooms.deletedAt));

      const totalCapacity = allActiveRooms.reduce((sum, r) => sum + (Number(r.capacity) || 1), 0);

      const stats = {
        total: allActiveRooms.length,
        available: allActiveRooms.filter((r) => r.status === 'available').length,
        occupied: allActiveRooms.filter((r) => r.status === 'occupied').length,
        maintenance: allActiveRooms.filter((r) => r.status === 'maintenance').length,
        notAllowed: allActiveRooms.filter((r) => r.status === 'not_allowed').length,
        totalCapacity,
      };

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        stats,
      };
    } catch (err: any) {
      console.error('[RoomsService] search error:', err);
      throw err;
    }
  }

  async get(id: string) {
    const rows = await this.db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, id), isNull(rooms.deletedAt)));
    if (!rows[0]) throw new NotFoundException('Room not found');
    return rows[0];
  }

  async create(actor: Actor, dto: CreateRoomDto, meta: Meta) {
    const cleanNumber = dto.roomNumber.trim().toUpperCase();
    const cleanName = dto.name.trim();

    // Check duplicate room number
    const existing = await this.db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.roomNumber, cleanNumber), isNull(rooms.deletedAt)));
    if (existing[0]) {
      throw new ConflictException(`Room number "${cleanNumber}" is already in use`);
    }

    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      roomNumber: cleanNumber,
      name: cleanName,
      type: dto.type,
      gender: dto.gender || 'common',
      status: dto.status || 'available',
      capacity: dto.capacity ? Math.max(1, dto.capacity) : 1,
      notes: dto.notes?.trim() || null,
      isActive: 1,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(rooms).values(row);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'room.create',
      entity: 'rooms',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }

  async update(actor: Actor, id: string, dto: UpdateRoomDto, meta: Meta) {
    const before = await this.get(id);

    if (dto.roomNumber) {
      const cleanNumber = dto.roomNumber.trim().toUpperCase();
      if (cleanNumber !== before.roomNumber) {
        const existing = await this.db
          .select({ id: rooms.id })
          .from(rooms)
          .where(and(eq(rooms.roomNumber, cleanNumber), isNull(rooms.deletedAt)));
        if (existing[0] && existing[0].id !== id) {
          throw new ConflictException(`Room number "${cleanNumber}" is already in use`);
        }
      }
    }

    const patch: Partial<typeof rooms.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.roomNumber !== undefined) patch.roomNumber = dto.roomNumber.trim().toUpperCase();
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.capacity !== undefined) patch.capacity = Math.max(1, dto.capacity);
    if (dto.notes !== undefined) patch.notes = dto.notes ? dto.notes.trim() : null;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive ? 1 : 0;

    await this.db.update(rooms).set(patch).where(eq(rooms.id, id));
    const after = await this.get(id);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'room.update',
      entity: 'rooms',
      entityId: id,
      before,
      after,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return after;
  }

  async updateStatus(actor: Actor, id: string, status: RoomStatus, meta: Meta) {
    const before = await this.get(id);
    const patch = {
      status,
      updatedAt: new Date().toISOString(),
    };

    await this.db.update(rooms).set(patch).where(eq(rooms.id, id));
    const after = await this.get(id);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'room.status_change',
      entity: 'rooms',
      entityId: id,
      before: { status: before.status },
      after: { status: after.status },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return after;
  }

  async delete(actor: Actor, id: string, meta: Meta) {
    const before = await this.get(id);
    const patch = {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.update(rooms).set(patch).where(eq(rooms.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'room.delete',
      entity: 'rooms',
      entityId: id,
      before,
      after: { deletedAt: patch.deletedAt },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, id };
  }
}
