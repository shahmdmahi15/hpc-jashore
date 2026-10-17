import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { settings } from '../db/schema';

@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: Db, private readonly audit: AuditService) {}

  async all() {
    return this.db.select().from(settings);
  }

  async get(key: string) {
    const rows = await this.db.select().from(settings).where(eq(settings.key, key));
    if (!rows[0]) throw new NotFoundException('Setting not found');
    return rows[0];
  }

  async put(actor: { sub: string; role: string }, key: string, valueJson: string, meta: { ip?: string | null; requestId?: string | null }) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(valueJson);
    } catch {
      throw new NotFoundException('valueJson must be valid JSON');
    }
    void parsed;
    const existing = await this.db.select().from(settings).where(eq(settings.key, key));
    const before = existing[0] ?? null;
    const row = {
      key,
      valueJson,
      updatedBy: actor.sub,
      updatedAt: new Date().toISOString(),
    };
    if (before) {
      await this.db.update(settings).set(row).where(eq(settings.key, key));
    } else {
      await this.db.insert(settings).values(row);
    }
    await this.audit.log({
      actorUserId: actor.sub, actorRole: actor.role, action: 'settings.put',
      entity: 'settings', entityId: key, before, after: row, ip: meta.ip, requestId: meta.requestId,
    });
    return row;
  }
}
