import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, desc, eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  expenses,
  medicines,
  users,
} from '../db/schema';
import type {
  CreateExpenseDto,
  CreateMedicineDto,
  UpdateMedicineDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /**
   * List all medicines in the prescription catalog for doctors to prescribe.
   * HPC does not sell medicines; this is solely a doctor prescription directory.
   */
  async listMedicines() {
    return this.db
      .select()
      .from(medicines)
      .orderBy(asc(medicines.brandName));
  }

  async getMedicine(id: string) {
    const rows = await this.db
      .select()
      .from(medicines)
      .where(eq(medicines.id, id))
      .limit(1);
    const med = rows[0];
    if (!med) throw new NotFoundException('Medicine not found');
    return med;
  }

  async createMedicine(
    actor: { sub?: string; role?: string },
    dto: CreateMedicineDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      brandName: dto.brandName.trim(),
      genericName: dto.genericName.trim(),
      manufacturer: dto.manufacturer?.trim() ?? null,
      form: dto.form?.trim() ?? 'tablet',
      strength: dto.strength?.trim() ?? null,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(medicines).values(row);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'inventory.medicine_create',
      entity: 'medicines',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }

  async updateMedicine(
    actor: { sub?: string; role?: string },
    id: string,
    dto: UpdateMedicineDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const existing = await this.getMedicine(id);
    const now = new Date().toISOString();

    const updates: Partial<typeof medicines.$inferInsert> = {
      updatedAt: now,
    };

    if (dto.brandName !== undefined) updates.brandName = dto.brandName.trim();
    if (dto.genericName !== undefined) updates.genericName = dto.genericName.trim();
    if (dto.manufacturer !== undefined) updates.manufacturer = dto.manufacturer?.trim() ?? null;
    if (dto.form !== undefined) updates.form = dto.form?.trim() ?? 'tablet';
    if (dto.strength !== undefined) updates.strength = dto.strength?.trim() ?? null;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    await this.db.update(medicines).set(updates).where(eq(medicines.id, id));

    const updated = await this.getMedicine(id);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'inventory.medicine_update',
      entity: 'medicines',
      entityId: id,
      before: existing,
      after: updated,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return updated;
  }

  async deleteMedicine(
    actor: { sub?: string; role?: string },
    id: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const existing = await this.getMedicine(id);
    await this.db.delete(medicines).where(eq(medicines.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'inventory.medicine_delete',
      entity: 'medicines',
      entityId: id,
      before: existing,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, deletedId: id };
  }

  // --- Clinic Expenses --------------------------------------------------------

  async listExpenses() {
    return this.db
      .select({
        expense: expenses,
        approvedBy: users,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.approvedByStaffId, users.id))
      .orderBy(desc(expenses.paidAt));
  }

  async createExpense(
    actor: { sub?: string; role?: string },
    staffId: string,
    dto: CreateExpenseDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      category: dto.category,
      description: dto.description.trim(),
      amountPaisa: dto.amountPaisa,
      voucherNumber: dto.voucherNumber?.trim() ?? null,
      approvedByStaffId: staffId,
      paidAt: dto.paidAt ?? now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(expenses).values(row);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'inventory.expense_create',
      entity: 'expenses',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }
}
