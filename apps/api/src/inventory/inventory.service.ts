import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  expenses,
  medicines,
  prescriptionItems,
  stockMoves,
  users,
} from '../db/schema';
import type {
  CreateExpenseDto,
  CreateMedicineDto,
  DispenseMedicineDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async listMedicines() {
    const medList = await this.db.select().from(medicines);

    return medList.map((m) => {
      const totalStock = m.currentStock ?? 0;
      return {
        ...m,
        totalStock,
        isLowStock: totalStock <= m.minStockAlert,
        nearExpiryCount: 0,
        batches: [],
      };
    });
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
      minStockAlert: dto.minStockAlert ?? 20,
      currentStock: dto.currentStock ?? 0,
      mrpPaisa: dto.mrpPaisa ?? 0,
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

  async dispenseFIFO(
    actor: { sub?: string; role?: string },
    staffId: string,
    dto: DispenseMedicineDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const medRows = await this.db
      .select()
      .from(medicines)
      .where(eq(medicines.id, dto.medicineId));
    const med = medRows[0];
    if (!med) {
      throw new NotFoundException('Medicine not found');
    }

    const availableStock = med.currentStock ?? 0;
    if (availableStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock: requested ${dto.quantity}, available ${availableStock}`,
      );
    }

    const now = new Date().toISOString();
    const newStock = availableStock - dto.quantity;

    await this.db
      .update(medicines)
      .set({ currentStock: newStock, updatedAt: now })
      .where(eq(medicines.id, med.id));

    await this.db.insert(stockMoves).values({
      id: randomUUID(),
      medicineId: dto.medicineId,
      moveType: 'dispense',
      quantity: -dto.quantity,
      referenceType: dto.prescriptionItemId ? 'prescription' : 'direct_dispense',
      referenceId: dto.prescriptionItemId ?? null,
      actorStaffId: staffId,
      note: dto.note ?? 'Direct dispense',
      createdAt: now,
      updatedAt: now,
    });

    if (dto.prescriptionItemId) {
      await this.db
        .update(prescriptionItems)
        .set({ isDispensed: 1 })
        .where(eq(prescriptionItems.id, dto.prescriptionItemId));
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'inventory.dispense',
      entity: 'medicines',
      entityId: dto.medicineId,
      after: { quantityDispensed: dto.quantity, prescriptionItemId: dto.prescriptionItemId },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, quantityDispensed: dto.quantity };
  }

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
