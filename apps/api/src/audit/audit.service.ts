import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, like, lte, or } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { auditLogs, users } from '../db/schema';
import { paged } from '../common/pagination.dto';

export interface AuditEntry {
  actorUserId?: string | null;
  actorRole?: string | null;
  deskId?: string | null;
  pinStaffId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  requestId?: string | null;
}

export interface AuditQueryOptions {
  page?: number;
  limit?: number;
  actor?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  search?: string;
}

const MAX_JSON_BYTES = 16 * 1024;

function cappedJson(value: unknown): string | null {
  if (value === undefined) return null;
  let json = JSON.stringify(value);
  if (Buffer.byteLength(json, 'utf8') > MAX_JSON_BYTES) {
    json = JSON.stringify({ _truncated: true, preview: json.slice(0, 4000) });
  }
  return json;
}

// Append-only audit writer & rich audit querying engine.
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorUserId: entry.actorUserId ?? null,
      actorRole: entry.actorRole ?? null,
      deskId: entry.deskId ?? null,
      pinStaffId: entry.pinStaffId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      beforeJson: cappedJson(entry.before),
      afterJson: cappedJson(entry.after),
      ip: entry.ip ?? null,
      requestId: entry.requestId ?? null,
    });
  }

  async query(user: { sub: string; role: string }, q: AuditQueryOptions) {
    const page = Math.max(1, q.page || 1);
    const limit = Math.min(200, Math.max(1, q.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Doctors/staff see only rows where they are the actor; admin sees everything.
    if (user.role !== 'admin') {
      conditions.push(eq(auditLogs.actorUserId, user.sub));
    } else if (q.actor) {
      conditions.push(eq(auditLogs.actorUserId, q.actor));
    }

    if (q.entity) conditions.push(eq(auditLogs.entity, q.entity));
    if (q.action) conditions.push(eq(auditLogs.action, q.action));

    if (q.from) {
      const fromIso = q.from.length === 10 ? `${q.from}T00:00:00.000Z` : q.from;
      conditions.push(gte(auditLogs.occurredAt, fromIso));
    }
    if (q.to) {
      const toIso = q.to.length === 10 ? `${q.to}T23:59:59.999Z` : q.to;
      conditions.push(lte(auditLogs.occurredAt, toIso));
    }

    if (q.search && q.search.trim()) {
      const pattern = `%${q.search.trim()}%`;
      conditions.push(
        or(
          like(auditLogs.action, pattern),
          like(auditLogs.entity, pattern),
          like(auditLogs.actorRole, pattern),
          like(auditLogs.entityId, pattern),
          like(users.displayName, pattern),
          like(users.email, pattern),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = this.db
      .select({
        id: auditLogs.id,
        occurredAt: auditLogs.occurredAt,
        actorUserId: auditLogs.actorUserId,
        actorRole: auditLogs.actorRole,
        actorDisplayName: users.displayName,
        actorEmail: users.email,
        userRole: users.role,
        deskId: auditLogs.deskId,
        pinStaffId: auditLogs.pinStaffId,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        beforeJson: auditLogs.beforeJson,
        afterJson: auditLogs.afterJson,
        ip: auditLogs.ip,
        requestId: auditLogs.requestId,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id));

    const rows = where
      ? await baseQuery
          .where(where)
          .orderBy(desc(auditLogs.id))
          .limit(limit)
          .offset(offset)
      : await baseQuery
          .orderBy(desc(auditLogs.id))
          .limit(limit)
          .offset(offset);

    const countQuery = this.db
      .select({ total: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id));

    const countRes = where ? await countQuery.where(where) : await countQuery;
    const total = countRes[0]?.total ?? 0;

    const enrichedRows = rows.map((r) => ({
      id: r.id,
      occurredAt: r.occurredAt,
      actorUserId: r.actorUserId,
      actorRole: r.actorRole || r.userRole || null,
      actorDisplayName: r.actorDisplayName || (r.actorUserId ? 'Staff' : 'System'),
      actorEmail: r.actorEmail || null,
      deskId: r.deskId,
      pinStaffId: r.pinStaffId,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      beforeJson: r.beforeJson,
      afterJson: r.afterJson,
      ip: r.ip,
      requestId: r.requestId,
    }));

    return paged(enrichedRows, total, page, limit);
  }
}
