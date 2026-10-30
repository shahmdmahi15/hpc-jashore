import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import {
  bills,
  consultations,
  dues,
  expenses,
  feedback,
  modalities,
  payments,
  prescriptions,
  therapySessions,
  users,
  visits,
} from '../db/schema';

function getDhakaDayRangeUtc(dateString: string): { startUtc: string; endUtc: string } {
  const parts = dateString.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  // Dhaka is UTC+6: midnight Dhaka is 18:00 UTC previous calendar date
  const startMs = Date.UTC(year, month, day, 0, 0, 0) - 6 * 3600 * 1000;
  const endMs = Date.UTC(year, month, day, 23, 59, 59, 999) - 6 * 3600 * 1000;
  return {
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(endMs).toISOString(),
  };
}

@Injectable()
export class ReportsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getDailySummary(dateString?: string) {
    const targetDate = dateString ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
    const { startUtc, endUtc } = getDhakaDayRangeUtc(targetDate);

    const dayVisits = await this.db
      .select()
      .from(visits)
      .where(eq(visits.visitDate, targetDate));

    const totalFootfall = dayVisits.length;
    const completedVisits = dayVisits.filter((v) => v.status === 'checked_out').length;

    // Collections: SQL-level date range index filtering to eliminate heap exhaustion
    const dayPayments = await this.db
      .select({
        amountPaisa: payments.amountPaisa,
        method: payments.method,
      })
      .from(payments)
      .where(
        or(
          and(gte(payments.createdAt, startUtc), lte(payments.createdAt, endUtc)),
          like(payments.createdAt, `${targetDate}%`),
        ),
      );

    let cashTotal = 0;
    let bkashTotal = 0;
    let nagadTotal = 0;
    let rocketTotal = 0;
    let cardTotal = 0;
    let bankTotal = 0;

    for (const p of dayPayments) {
      if (p.method === 'cash') cashTotal += p.amountPaisa;
      else if (p.method === 'bkash') bkashTotal += p.amountPaisa;
      else if (p.method === 'nagad') nagadTotal += p.amountPaisa;
      else if (p.method === 'rocket') rocketTotal += p.amountPaisa;
      else if (p.method === 'card') cardTotal += p.amountPaisa;
      else if (p.method === 'bank') bankTotal += p.amountPaisa;
    }
    const totalCollectionPaisa =
      cashTotal + bkashTotal + nagadTotal + rocketTotal + cardTotal + bankTotal;

    // Outstanding dues
    const pendingDues = await this.db
      .select()
      .from(dues)
      .where(eq(dues.status, 'pending'));
    const totalPendingDuesPaisa = pendingDues.reduce((acc, d) => acc + d.amountPaisa, 0);

    // Active occupancy (therapy sessions vs capacity)
    const totalCapacity = 10;
    const occupiedCapacity = (
      await this.db
        .select({ id: therapySessions.id })
        .from(therapySessions)
        .where(eq(therapySessions.status, 'in_progress'))
    ).length;
    const bedOccupancyPercent = totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0;

    return {
      date: targetDate,
      footfall: totalFootfall,
      grossCollectionsPaisa: totalCollectionPaisa,
      bedOccupancyPercent,
      totalDuesPaisa: totalPendingDuesPaisa,
      footfallDetails: {
        total: totalFootfall,
        completed: completedVisits,
        activeInClinic: totalFootfall - completedVisits,
      },
      collections: {
        totalPaisa: totalCollectionPaisa,
        totalBdt: totalCollectionPaisa / 100,
        byMethod: {
          cashPaisa: cashTotal,
          bkashPaisa: bkashTotal,
          nagadPaisa: nagadTotal,
          rocketPaisa: rocketTotal,
          cardPaisa: cardTotal,
          bankPaisa: bankTotal,
        },
      },
      dues: {
        totalPendingDuesPaisa,
        totalPendingDuesBdt: totalPendingDuesPaisa / 100,
        count: pendingDues.length,
      },
      occupancy: {
        totalBeds: totalCapacity,
        occupiedBeds: occupiedCapacity,
        ratePercent: bedOccupancyPercent,
      },
    };
  }

  async getModalityStats(dateString?: string) {
    const targetDate = dateString ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
    const { startUtc, endUtc } = getDhakaDayRangeUtc(targetDate);

    const allMods = await this.db.select().from(modalities).where(eq(modalities.isActive, 1));
    const daySessions = await this.db
      .select({
        id: therapySessions.id,
        modalityCode: therapySessions.modalityCode,
      })
      .from(therapySessions)
      .where(
        or(
          and(gte(therapySessions.createdAt, startUtc), lte(therapySessions.createdAt, endUtc)),
          like(therapySessions.createdAt, `${targetDate}%`),
          like(therapySessions.startedAt, `${targetDate}%`),
        ),
      );

    const standardModalities = [
      { code: 'traction', nameEn: 'Traction Therapy (Cervical / Lumbar)', nameBn: 'ট্র্যাকশন থেরাপি', pricePaisa: 40000 },
      { code: 'swd', nameEn: 'Shortwave Diathermy (SWD)', nameBn: 'শর্টওয়েভ ডায়াথার্মি', pricePaisa: 35000 },
      { code: 'ust', nameEn: 'Therapeutic Ultrasound (UST)', nameBn: 'আল্ট্রাসাউন্ড থেরাপি', pricePaisa: 30000 },
      { code: 'laser', nameEn: 'Class-IV Deep Tissue Laser', nameBn: 'লেজার থেরাপি', pricePaisa: 60000 },
      { code: 'exercise', nameEn: 'Manual & Exercise Therapy', nameBn: 'এক্সারসাইজ থেরাপি', pricePaisa: 50000 },
    ];

    if (allMods.length === 0) {
      return standardModalities.map((sm) => {
        const modSessions = daySessions.filter((s) => s.modalityCode === sm.code);
        return {
          id: sm.code,
          code: sm.code,
          nameEn: sm.nameEn,
          nameBn: sm.nameBn,
          sessionCount: modSessions.length,
          revenuePaisa: modSessions.length * sm.pricePaisa,
        };
      });
    }

    return allMods.map((m) => {
      const modSessions = daySessions.filter((s) => s.modalityCode === m.code);
      return {
        id: m.id,
        code: m.code,
        nameEn: m.nameEn,
        nameBn: m.nameBn,
        sessionCount: modSessions.length,
        revenuePaisa: modSessions.length * m.defaultPricePaisa,
      };
    });
  }

  async getDoctorStats(dateString?: string) {
    const targetDate = dateString ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
    const { startUtc, endUtc } = getDhakaDayRangeUtc(targetDate);

    const doctors = await this.db
      .select()
      .from(users)
      .where(and(eq(users.role, 'doctor'), eq(users.approvalStatus, 'approved'), eq(users.isActive, 1)));

    const dayConsults = await this.db
      .select({ id: consultations.id, doctorId: consultations.doctorId })
      .from(consultations)
      .where(
        or(
          and(gte(consultations.createdAt, startUtc), lte(consultations.createdAt, endUtc)),
          like(consultations.createdAt, `${targetDate}%`),
        ),
      );

    const dayPrescripts = await this.db
      .select({ id: prescriptions.id, doctorId: prescriptions.doctorId })
      .from(prescriptions)
      .where(
        or(
          and(gte(prescriptions.createdAt, startUtc), lte(prescriptions.createdAt, endUtc)),
          like(prescriptions.createdAt, `${targetDate}%`),
        ),
      );

    return doctors.map((doc) => {
      const docConsults = dayConsults.filter((c) => c.doctorId === doc.id);
      const docPrescripts = dayPrescripts.filter((p) => p.doctorId === doc.id);

      return {
        id: doc.id,
        name: doc.displayName,
        specialization: doc.specialization || 'Physiotherapy & Rehabilitation',
        patientsSeen: docConsults.length,
        prescriptionsCount: docPrescripts.length,
        feePaisa: doc.consultationFeePaisa ?? 50000,
      };
    });
  }

  async getDoctorIncomeReport() {
    const doctors = await this.db
      .select()
      .from(users)
      .where(and(eq(users.role, 'doctor'), eq(users.approvalStatus, 'approved'), eq(users.isActive, 1)));

    const allConsults = await this.db
      .select({ id: consultations.id, doctorId: consultations.doctorId })
      .from(consultations);

    return doctors.map((doc) => {
      const docConsults = allConsults.filter((c) => c.doctorId === doc.id);
      const feePaisa = doc.consultationFeePaisa ?? 50000;
      const estimatedIncomePaisa = docConsults.length * feePaisa;

      return {
        doctorId: doc.id,
        doctorName: doc.displayName,
        specialization: doc.specialization,
        totalConsultations: docConsults.length,
        feePerConsultPaisa: feePaisa,
        estimatedRevenuePaisa: estimatedIncomePaisa,
      };
    });
  }

  async getTherapistPerformance() {
    const handlers = await this.db
      .select()
      .from(users)
      .where(and(eq(users.role, 'handler'), eq(users.approvalStatus, 'approved'), eq(users.isActive, 1)));

    const allSessions = await this.db
      .select({
        id: therapySessions.id,
        therapistStaffId: therapySessions.therapistStaffId,
        status: therapySessions.status,
        isOvertime: therapySessions.isOvertime,
      })
      .from(therapySessions);

    return handlers.map((t) => {
      const mySessions = allSessions.filter((s) => s.therapistStaffId === t.id);
      const completed = mySessions.filter((s) => s.status === 'completed');
      const overtime = completed.filter((s) => s.isOvertime === 1);
      const onTimeRate =
        completed.length > 0
          ? Math.round(((completed.length - overtime.length) / completed.length) * 100)
          : 100;

      return {
        therapistId: t.id,
        therapistName: t.displayName,
        handlerId: t.id,
        handlerName: t.displayName,
        totalAssigned: mySessions.length,
        completedSessions: completed.length,
        onTimeRatePercent: onTimeRate,
      };
    });
  }

  async getPnlSummary() {
    const paymentRows = await this.db
      .select({ amountPaisa: payments.amountPaisa })
      .from(payments);
    const totalRevenuePaisa = paymentRows.reduce((acc, p) => acc + p.amountPaisa, 0);

    const expenseRows = await this.db
      .select({ amountPaisa: expenses.amountPaisa, category: expenses.category })
      .from(expenses);
    const totalExpensesPaisa = expenseRows.reduce((acc, e) => acc + e.amountPaisa, 0);

    const netProfitPaisa = totalRevenuePaisa - totalExpensesPaisa;

    const byCategory: Record<string, number> = {};
    for (const exp of expenseRows) {
      byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amountPaisa;
    }

    return {
      revenuePaisa: totalRevenuePaisa,
      revenueBdt: totalRevenuePaisa / 100,
      expensesPaisa: totalExpensesPaisa,
      expensesBdt: totalExpensesPaisa / 100,
      netProfitPaisa,
      netProfitBdt: netProfitPaisa / 100,
      expensesByCategory: byCategory,
    };
  }

  async getFeedbackSummary() {
    const rows = await this.db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(50);
    const averageRating =
      rows.length > 0 ? (rows.reduce((acc, f) => acc + f.rating, 0) / rows.length).toFixed(1) : '5.0';

    return {
      totalFeedbackCount: rows.length,
      averageRating: Number(averageRating),
      recentFeedback: rows.slice(0, 20),
    };
  }
}
