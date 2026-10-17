import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';
import { auditLogs } from '../db/schema';

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

const MAX_JSON_BYTES = 16 * 1024;

function cappedJson(value: unknown): string | null {
  if (value === undefined) return null;
  let json = JSON.stringify(value);
  if (Buffer.byteLength(json, 'utf8') > MAX_JSON_BYTES) {
    json = JSON.stringify({ _truncated: true, preview: json.slice(0, 4000) });
  }
  return json;
}

// Append-only audit writer. Every mutating service calls audit.log() in the
// same logical operation as the write (same request, never silent).
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
}
