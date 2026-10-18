import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import {
  billItems,
  bills,
  cashDrawers,
  drawerEvents,
  dues,
  patients,
  payments,
  sequences,
  staff,
  visits,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  CloseDrawerDto,
  CreateBillDto,
  OpenDrawerDto,
  RecordPaymentDto,
  VoidBillDto,
} from './dto';

@Injectable()
export class BillingService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly gateway: EventsGateway,
    private readonly realtime: RealtimeService,
  ) {}

  private async nextBillNumber(year: number): Promise<string> {
    return this.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(sequences)
        .where(and(eq(sequences.scope, 'bill'), eq(sequences.year, year)))
        .all();
      let nextVal = 1;
      if (existing.length === 0) {
        tx.insert(sequences).values({ scope: 'bill', year, lastValue: 1 }).run();
      } else {
        nextVal = existing[0].lastValue + 1;
        tx.update(sequences)
          .set({ lastValue: nextVal })
          .where(and(eq(sequences.scope, 'bill'), eq(sequences.year, year)))
          .run();
      }
      const yy = String(year).slice(-2);
      const seqStr = String(nextVal).padStart(5, '0');
      return `BILL-${yy}-${seqStr}`;
    });
  }

  private async resolveStaffId(staffIdOrUserId: string): Promise<string> {
    const directStaff = await this.db
      .select({ id: staff.id })
      .from(staff)
      .where(eq(staff.id, staffIdOrUserId));
    if (directStaff[0]) return directStaff[0].id;

    const byUser = await this.db
      .select({ id: staff.id })
      .from(staff)
      .where(eq(staff.userId, staffIdOrUserId));
    if (byUser[0]) return byUser[0].id;

    const anyCashier = await this.db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.role, 'cashier'), eq(staff.isActive, 1)))
      .limit(1);
    if (anyCashier[0]) return anyCashier[0].id;

    const anyStaff = await this.db
      .select({ id: staff.id })
      .from(staff)
      .where(eq(staff.isActive, 1))
      .limit(1);
    return anyStaff[0]?.id ?? staffIdOrUserId;
  }

  async createBill(
    actor: { sub?: string; role?: string },
    cashierStaffId: string,
    dto: CreateBillDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const effectiveCashierId = await this.resolveStaffId(cashierStaffId);
    const patientRows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId));
    if (!patientRows[0]) throw new NotFoundException('Patient not found');

    const year = new Date().getFullYear();
    const billNumber = await this.nextBillNumber(year);

    let subtotalPaisa = 0;
    let lineDiscountsPaisa = 0;

    const itemsToInsert = dto.items.map((item) => {
      const lineSubtotal = item.unitPricePaisa * item.quantity;
      const lineDiscount = item.discountPaisa ?? 0;
      const lineTotal = Math.max(0, lineSubtotal - lineDiscount);

      subtotalPaisa += lineSubtotal;
      lineDiscountsPaisa += lineDiscount;

      return {
        id: randomUUID(),
        itemType: item.itemType,
        itemId: item.itemId ?? null,
        description: item.description,
        unitPricePaisa: item.unitPricePaisa,
        quantity: item.quantity,
        discountPaisa: lineDiscount,
        totalPaisa: lineTotal,
      };
    });

    const overallDiscount = dto.overallDiscountPaisa ?? dto.discountPaisa ?? 0;
    const totalDiscountPaisa = lineDiscountsPaisa + overallDiscount;
    const totalPaisa = Math.max(0, subtotalPaisa - totalDiscountPaisa);

    const now = new Date().toISOString();
    const billId = randomUUID();
    const billRow = {
      id: billId,
      billNumber,
      visitId: dto.visitId ?? null,
      patientId: dto.patientId,
      cashierStaffId: effectiveCashierId,
      subtotalPaisa,
      discountPaisa: totalDiscountPaisa,
      discountApprovedBy: null,
      totalPaisa,
      paidPaisa: 0,
      duePaisa: totalPaisa,
      status: 'draft' as const,
      paymentMethod: dto.paymentMethod ?? 'cash',
      notes: dto.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(bills).values(billRow);

    for (const item of itemsToInsert) {
      await this.db.insert(billItems).values({ ...item, billId });
    }

    if (dto.paidPaisa && dto.paidPaisa > 0) {
      await this.recordPayment(
        actor,
        effectiveCashierId,
        billId,
        {
          amountPaisa: Math.min(dto.paidPaisa, totalPaisa),
          method: dto.paymentMethod ?? 'cash',
          txnId: dto.txnId,
        },
        meta,
      );
      const updated = await this.db.select().from(bills).where(eq(bills.id, billId));
      if (updated[0]) {
        Object.assign(billRow, updated[0]);
      }
    }

    const payload = {
      billId,
      billNumber,
      patientId: dto.patientId,
      totalPaisa,
    };
    this.gateway.emit('clinic:global', 'bill.created', payload);
    this.realtime.publish('bill.created', payload);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'billing.bill_create',
      entity: 'bills',
      entityId: billId,
      after: { billRow, itemsCount: itemsToInsert.length },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ...billRow, bill: billRow, items: itemsToInsert };
  }

  async recordPayment(
    actor: { sub?: string; role?: string },
    cashierStaffId: string,
    billId: string,
    dto: RecordPaymentDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const effectiveCashierId = await this.resolveStaffId(cashierStaffId);
    const billRows = await this.db.select().from(bills).where(eq(bills.id, billId));
    const bill = billRows[0];
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status === 'voided') throw new BadRequestException('Cannot pay a voided bill');

    const newPaidPaisa = bill.paidPaisa + dto.amountPaisa;
    const newDuePaisa = Math.max(0, bill.totalPaisa - newPaidPaisa);
    const newStatus = newDuePaisa === 0 ? 'posted' : 'draft';
    const now = new Date().toISOString();

    await this.db
      .update(bills)
      .set({
        paidPaisa: newPaidPaisa,
        duePaisa: newDuePaisa,
        status: newStatus,
        paymentMethod: dto.method,
        updatedAt: now,
      })
      .where(eq(bills.id, billId));

    const paymentId = randomUUID();
    const paymentRow = {
      id: paymentId,
      billId,
      patientId: bill.patientId,
      amountPaisa: dto.amountPaisa,
      method: dto.method,
      txnId: dto.txnId ?? null,
      receivedByStaffId: effectiveCashierId,
      receiptPrintedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(payments).values(paymentRow);

    // Track due if balance remains
    if (newDuePaisa > 0) {
      const dueExisting = await this.db
        .select()
        .from(dues)
        .where(eq(dues.billId, billId));
      if (dueExisting.length > 0) {
        await this.db
          .update(dues)
          .set({ amountPaisa: newDuePaisa, settledPaisa: newPaidPaisa, status: 'partial', updatedAt: now })
          .where(eq(dues.id, dueExisting[0].id));
      } else {
        await this.db.insert(dues).values({
          id: randomUUID(),
          patientId: bill.patientId,
          billId,
          amountPaisa: newDuePaisa,
          settledPaisa: newPaidPaisa,
          status: 'partial',
          approvedBy: effectiveCashierId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Record cash in active drawer if payment is cash
    if (dto.method === 'cash') {
      const activeDrawer = await this.db
        .select()
        .from(cashDrawers)
        .where(and(eq(cashDrawers.cashierStaffId, effectiveCashierId), eq(cashDrawers.status, 'open')))
        .limit(1);
      if (activeDrawer[0]) {
        await this.db.insert(drawerEvents).values({
          id: randomUUID(),
          drawerId: activeDrawer[0].id,
          eventType: 'sale_cash',
          amountPaisa: dto.amountPaisa,
          description: `Bill payment for ${bill.billNumber}`,
          staffId: effectiveCashierId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const payload = {
      paymentId,
      billId,
      patientId: bill.patientId,
      amountPaisa: dto.amountPaisa,
      method: dto.method,
      duePaisa: newDuePaisa,
    };

    this.gateway.emit('clinic:global', 'payment.posted', payload);
    this.realtime.publish('payment.posted', payload);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'billing.payment_record',
      entity: 'payments',
      entityId: paymentId,
      after: payload,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, payment: paymentRow, paidPaisa: dto.amountPaisa, duePaisa: newDuePaisa, remainingDuePaisa: newDuePaisa };
  }

  async voidBill(
    actor: { sub?: string; role?: string },
    billId: string,
    dto: VoidBillDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const billRows = await this.db.select().from(bills).where(eq(bills.id, billId));
    const bill = billRows[0];
    if (!bill) throw new NotFoundException('Bill not found');

    const now = new Date().toISOString();
    await this.db
      .update(bills)
      .set({
        status: 'voided',
        notes: `[VOIDED: ${dto.reason}] ${bill.notes ?? ''}`,
        updatedAt: now,
      })
      .where(eq(bills.id, billId));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'billing.bill_void',
      entity: 'bills',
      entityId: billId,
      before: { status: bill.status, totalPaisa: bill.totalPaisa },
      after: { status: 'voided', reason: dto.reason },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, voidedAt: now };
  }

  async getBill(id: string) {
    const billRows = await this.db
      .select({
        bill: bills,
        patient: patients,
        cashier: staff,
      })
      .from(bills)
      .innerJoin(patients, eq(bills.patientId, patients.id))
      .leftJoin(staff, eq(bills.cashierStaffId, staff.id))
      .where(eq(bills.id, id));

    const record = billRows[0];
    if (!record) throw new NotFoundException('Bill not found');

    const items = await this.db.select().from(billItems).where(eq(billItems.billId, id));
    const paymentRecords = await this.db.select().from(payments).where(eq(payments.billId, id));

    return {
      ...record.bill,
      patient: {
        id: record.patient.id,
        mrn: record.patient.mrn,
        nameEn: record.patient.nameEn,
        nameBn: record.patient.nameBn,
        phone: record.patient.phone,
      },
      cashier: record.cashier ? { id: record.cashier.id, fullName: record.cashier.fullName } : null,
      items,
      payments: paymentRecords,
      printSpecs: {
        customPaperInvoice: '5.5in x 8.27in (140mm x 210mm)',
        thermalReceipt: '80mm Thermal Slip',
        clinicNameBn: 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর',
        clinicNameEn: 'HPC Health & Pain Care Center, Jashore',
      },
    };
  }

  async getPatientBillingHistory(patientId: string) {
    const patientBills = await this.db
      .select()
      .from(bills)
      .where(eq(bills.patientId, patientId))
      .orderBy(desc(bills.createdAt));

    const patientDues = await this.db
      .select()
      .from(dues)
      .where(eq(dues.patientId, patientId));

    return {
      bills: patientBills,
      dues: patientDues,
    };
  }

  async getAllBills(limit = 100) {
    const rows = await this.db
      .select({
        bill: bills,
        patient: patients,
        cashier: staff,
      })
      .from(bills)
      .innerJoin(patients, eq(bills.patientId, patients.id))
      .leftJoin(staff, eq(bills.cashierStaffId, staff.id))
      .orderBy(desc(bills.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r.bill,
      patient: {
        id: r.patient.id,
        mrn: r.patient.mrn,
        nameEn: r.patient.nameEn,
        nameBn: r.patient.nameBn,
        phone: r.patient.phone,
      },
      cashier: r.cashier ? { id: r.cashier.id, fullName: r.cashier.fullName } : null,
    }));
  }

  async getAllDues() {
    const rows = await this.db
      .select({
        due: dues,
        patient: patients,
        bill: bills,
      })
      .from(dues)
      .innerJoin(patients, eq(dues.patientId, patients.id))
      .leftJoin(bills, eq(dues.billId, bills.id))
      .orderBy(desc(dues.createdAt));

    return rows.map((r) => ({
      ...r.due,
      patient: {
        id: r.patient.id,
        mrn: r.patient.mrn,
        nameEn: r.patient.nameEn,
        nameBn: r.patient.nameBn,
        phone: r.patient.phone,
      },
      billNumber: r.bill?.billNumber,
    }));
  }

  // --- Cash Drawers -----------------------------------------------------------

  async openDrawer(
    actor: { sub?: string; role?: string },
    cashierStaffId: string,
    dto: OpenDrawerDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const effectiveCashierId = await this.resolveStaffId(cashierStaffId);
    const existing = await this.db
      .select()
      .from(cashDrawers)
      .where(and(eq(cashDrawers.cashierStaffId, effectiveCashierId), eq(cashDrawers.status, 'open')));
    if (existing.length > 0) {
      throw new BadRequestException('You already have an open drawer shift. Close it first.');
    }

    const now = new Date().toISOString();
    const drawerId = randomUUID();
    const row = {
      id: drawerId,
      cashierStaffId: effectiveCashierId,
      deskId: dto.deskId,
      shiftId: null,
      openedAt: now,
      closedAt: null,
      openingCashPaisa: dto.openingCashPaisa,
      closingCashActualPaisa: null,
      closingCashExpectedPaisa: null,
      variancePaisa: null,
      varianceReason: null,
      status: 'open' as const,
      closedByAdminId: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(cashDrawers).values(row);

    await this.db.insert(drawerEvents).values({
      id: randomUUID(),
      drawerId,
      eventType: 'open',
      amountPaisa: dto.openingCashPaisa,
      description: 'Opening cash float',
      staffId: effectiveCashierId,
      createdAt: now,
      updatedAt: now,
    });

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'drawer.open',
      entity: 'cash_drawers',
      entityId: drawerId,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }

  async getCurrentDrawer(cashierStaffId: string) {
    const effectiveCashierId = await this.resolveStaffId(cashierStaffId);
    const rows = await this.db
      .select()
      .from(cashDrawers)
      .where(and(eq(cashDrawers.cashierStaffId, effectiveCashierId), eq(cashDrawers.status, 'open')))
      .limit(1);
    const drawer = rows[0];
    if (!drawer) return { hasActiveDrawer: false, drawer: null };

    const events = await this.db
      .select()
      .from(drawerEvents)
      .where(eq(drawerEvents.drawerId, drawer.id));

    let cashSalesTotal = 0;
    let cashDropsTotal = 0;
    let payoutsTotal = 0;

    for (const e of events) {
      if (e.eventType === 'sale_cash') cashSalesTotal += e.amountPaisa;
      else if (e.eventType === 'drop') cashDropsTotal += e.amountPaisa;
      else if (e.eventType === 'payout') payoutsTotal += e.amountPaisa;
    }

    const expectedCashPaisa = drawer.openingCashPaisa + cashSalesTotal - cashDropsTotal - payoutsTotal;

    return {
      hasActiveDrawer: true,
      isOpen: true,
      drawer: {
        ...drawer,
        cashSalesTotal,
        cashDropsTotal,
        payoutsTotal,
        expectedCashPaisa,
        events,
      },
      cashSalesTotalPaisa: cashSalesTotal,
      cashDropsTotalPaisa: cashDropsTotal,
      payoutsTotalPaisa: payoutsTotal,
      expectedCashInDrawerPaisa: expectedCashPaisa,
      eventsCount: events.length,
      events,
    };
  }

  async closeDrawer(
    actor: { sub?: string; role?: string },
    cashierStaffId: string,
    dto: CloseDrawerDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const effectiveCashierId = await this.resolveStaffId(cashierStaffId);
    const current = await this.getCurrentDrawer(effectiveCashierId);
    if (!current.hasActiveDrawer || !current.drawer) {
      throw new BadRequestException('No active open drawer found for this cashier');
    }

    const drawer = current.drawer;
    const expected = current.expectedCashInDrawerPaisa;
    const actual = dto.closingCashActualPaisa;
    const variance = actual - expected;

    if (variance !== 0 && !dto.varianceReason && actor.role !== 'admin') {
      throw new BadRequestException(`Drawer has a variance of ${(variance / 100).toFixed(2)} BDT. A variance reason or admin PIN is required.`);
    }

    const now = new Date().toISOString();
    await this.db
      .update(cashDrawers)
      .set({
        closedAt: now,
        closingCashActualPaisa: actual,
        closingCashExpectedPaisa: expected,
        variancePaisa: variance,
        varianceReason: dto.varianceReason ?? null,
        status: 'closed',
        closedByAdminId: actor.sub ?? null,
        updatedAt: now,
      })
      .where(eq(cashDrawers.id, drawer.id));

    await this.db.insert(drawerEvents).values({
      id: randomUUID(),
      drawerId: drawer.id,
      eventType: 'close',
      amountPaisa: actual,
      description: `Closing count (variance: ${(variance / 100).toFixed(2)} BDT)`,
      staffId: effectiveCashierId,
      createdAt: now,
      updatedAt: now,
    });

    this.gateway.emit('clinic:global', 'drawer.closed', { drawerId: drawer.id, cashierStaffId: effectiveCashierId, variance });
    this.realtime.publish('drawer.closed', { drawerId: drawer.id, variance });

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'drawer.close',
      entity: 'cash_drawers',
      entityId: drawer.id,
      after: { actual, expected, variance, reason: dto.varianceReason },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      ok: true,
      drawerId: drawer.id,
      closedAt: now,
      openingFloatPaisa: drawer.openingCashPaisa,
      cashSalesPaisa: current.cashSalesTotalPaisa,
      expectedCashPaisa: expected,
      actualCashPaisa: actual,
      variancePaisa: variance,
    };
  }

  async getDailyDrawerReport() {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.db
      .select({
        drawer: cashDrawers,
        cashier: staff,
      })
      .from(cashDrawers)
      .innerJoin(staff, eq(cashDrawers.cashierStaffId, staff.id))
      .orderBy(desc(cashDrawers.openedAt));

    return rows.map((r) => ({
      ...r.drawer,
      cashierName: r.cashier.fullName,
    }));
  }
}
