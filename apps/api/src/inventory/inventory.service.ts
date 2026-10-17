import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  batches,
  expenses,
  medicines,
  prescriptionItems,
  staff,
  stockMoves,
} from '../db/schema';
import type {
  CreateExpenseDto,
  CreateMedicineDto,
  DispenseMedicineDto,
  PurchaseBatchDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async listMedicines() {
    const medList = await this.db.select().from(medicines);
    const allBatches = await this.db.select().from(batches);

    const now = new Date();
    const ninetyDaysAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return medList.map((m) => {
      const medBatches = allBatches.filter((b) => b.medicineId === m.id);
      const totalStock = medBatches.reduce((acc, b) => acc + b.quantityInStock, 0);
      const nearExpiryCount = medBatches.filter(
        (b) => b.quantityInStock > 0 && b.expDate <= ninetyDaysAhead,
      ).length;

      return {
        ...m,
        totalStock,
        isLowStock: totalStock <= m.minStockAlert,
        nearExpiryCount,
        batches: medBatches,
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

  async purchaseBatch(
    actor: { sub?: string; role?: string },
    staffId: string,
    dto: PurchaseBatchDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const medRows = await this.db.select().from(medicines).where(eq(medicines.id, dto.medicineId));
    if (!medRows[0]) throw new NotFoundException('Medicine not found');

    const now = new Date().toISOString();
    const batchId = randomUUID();
    const batchRow = {
      id: batchId,
      medicineId: dto.medicineId,
      batchNumber: dto.batchNumber.trim().toUpperCase(),
      mfgDate: dto.mfgDate ?? null,
      expDate: dto.expDate,
      purchaseRatePaisa: dto.purchaseRatePaisa,
      mrpPaisa: dto.mrpPaisa,
      quantityInStock: dto.quantity,
      isBlocked: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(batches).values(batchRow);

    await this.db.insert(stockMoves).values({
      id: randomUUID(),
      batchId,
      medicineId: dto.medicineId,
      moveType: 'purchase',
      quantity: dto.quantity,
      referenceType: 'purchase_order',
      referenceId: null,
      actorStaffId: staffId,
      note: `Initial batch purchase: ${batchRow.batchNumber}`,
      createdAt: now,
      updatedAt: now,
    });

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'inventory.batch_purchase',
      entity: 'batches',
      entityId: batchId,
      after: batchRow,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return batchRow;
  }

  async dispenseFIFO(
    actor: { sub?: string; role?: string },
    staffId: string,
    dto: DispenseMedicineDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const today = new Date().toISOString().slice(0, 10);
    // Fetch unblocked, non-expired batches ordered by expiry date ascending (FIFO)
    const availableBatches = await this.db
      .select()
      .from(batches)
      .where(
        and(
          eq(batches.medicineId, dto.medicineId),
          eq(batches.isBlocked, 0),
          gte(batches.expDate, today),
        ),
      )
      .orderBy(asc(batches.expDate));

    const totalAvailable = availableBatches.reduce((acc, b) => acc + b.quantityInStock, 0);
    if (totalAvailable < dto.quantity) {
      throw new BadRequestException(
        `Insufficient non-expired stock: requested ${dto.quantity}, available ${totalAvailable}`,
      );
    }

    let remainingToDispense = dto.quantity;
    const now = new Date().toISOString();

    for (const batch of availableBatches) {
      if (remainingToDispense <= 0) break;
      if (batch.quantityInStock <= 0) continue;

      const take = Math.min(batch.quantityInStock, remainingToDispense);
      const newStock = batch.quantityInStock - take;

      await this.db
        .update(batches)
        .set({ quantityInStock: newStock, updatedAt: now })
        .where(eq(batches.id, batch.id));

      await this.db.insert(stockMoves).values({
        id: randomUUID(),
        batchId: batch.id,
        medicineId: dto.medicineId,
        moveType: 'dispense',
        quantity: -take,
        referenceType: dto.prescriptionItemId ? 'prescription' : 'direct_dispense',
        referenceId: dto.prescriptionItemId ?? null,
        actorStaffId: staffId,
        note: dto.note ?? 'FIFO dispense',
        createdAt: now,
        updatedAt: now,
      });

      remainingToDispense -= take;
    }

    if (dto.prescriptionItemId) {
      await this.db
        .update(prescriptionItems)
        .set({ isDispensed: 1 })
        .where(eq(prescriptionItems.id, dto.prescriptionItemId));
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'inventory.dispense_fifo',
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
        approvedBy: staff,
      })
      .from(expenses)
      .leftJoin(staff, eq(expenses.approvedByStaffId, staff.id))
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
