import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import {
  beds,
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

@Injectable()
export class ReportsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getDailySummary(dateString?: string) {
    const targetDate = dateString ?? new Date().toISOString().slice(0, 10);

    const dayVisits = await this.db
      .select()
      .from(visits)
      .where(eq(visits.visitDate, targetDate));

    const totalFootfall = dayVisits.length;
    const completedVisits = dayVisits.filter((v) => v.status === 'checked_out').length;

    // Collections
    const allPayments = await this.db.select().from(payments);
    const dayPayments = allPayments.filter((p) => p.createdAt.startsWith(targetDate));

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

    // Active occupancy
    const totalBeds = (await this.db.select().from(beds)).length;
    const occupiedBeds = (
      await this.db
        .select()
        .from(therapySessions)
        .where(eq(therapySessions.status, 'in_progress'))
    ).length;
    const bedOccupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      date: targetDate,
      // Flat properties for direct widget consumption
      footfall: totalFootfall,
      grossCollectionsPaisa: totalCollectionPaisa,
      bedOccupancyPercent,
      totalDuesPaisa: totalPendingDuesPaisa,
      // Nested detailed properties for comprehensive reports
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
        totalBeds,
        occupiedBeds,
        ratePercent: bedOccupancyPercent,
      },
    };
  }

  async getModalityStats(dateString?: string) {
    const targetDate = dateString ?? new Date().toISOString().slice(0, 10);
    const allMods = await this.db.select().from(modalities).where(eq(modalities.isActive, 1));
    const allSessions = await this.db.select().from(therapySessions);
    const daySessions = allSessions.filter(
      (s) =>
        s.createdAt.startsWith(targetDate) ||
        (s.startedAt && s.startedAt.startsWith(targetDate)),
    );

    // Standard clinical modalities at HPC Jashore
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
    const targetDate = dateString ?? new Date().toISOString().slice(0, 10);
    const doctors = await this.db
      .select()
      .from(users)
      .where(and(eq(users.role, 'doctor'), eq(users.approvalStatus, 'approved'), eq(users.isActive, 1)));

    const allConsults = await this.db.select().from(consultations);
    const allPrescriptions = await this.db.select().from(prescriptions);

    return doctors.map((doc) => {
      const docConsults = allConsults.filter(
        (c) => c.doctorId === doc.id && c.createdAt.startsWith(targetDate),
      );
      const docPrescripts = allPrescriptions.filter(
        (p) => p.doctorId === doc.id && p.createdAt.startsWith(targetDate),
      );

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

    const allConsults = await this.db.select().from(consultations);

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

    const allSessions = await this.db.select().from(therapySessions);

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
    const allPayments = await this.db.select().from(payments);
    const totalRevenuePaisa = allPayments.reduce((acc, p) => acc + p.amountPaisa, 0);

    const allExpenses = await this.db.select().from(expenses);
    const totalExpensesPaisa = allExpenses.reduce((acc, e) => acc + e.amountPaisa, 0);

    const netProfitPaisa = totalRevenuePaisa - totalExpensesPaisa;

    // Group expenses by category
    const byCategory: Record<string, number> = {};
    for (const exp of allExpenses) {
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
    const rows = await this.db.select().from(feedback).orderBy(desc(feedback.createdAt));
    const averageRating =
      rows.length > 0 ? (rows.reduce((acc, f) => acc + f.rating, 0) / rows.length).toFixed(1) : '5.0';

    return {
      totalFeedbackCount: rows.length,
      averageRating: Number(averageRating),
      recentFeedback: rows.slice(0, 20),
    };
  }
}
