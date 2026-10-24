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
  assessments,
  consultations,
  patients,
  prescriptionItems,
  prescriptions,
  therapyPlans,
  users,
  visits,
} from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  CreateAssessmentDto,
  CreateConsultationDto,
  CreateStandalonePrescriptionDto,
} from './dto';

@Injectable()
export class ClinicalService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly gateway: EventsGateway,
    private readonly realtime: RealtimeService,
  ) {}

  async createConsultation(
    actor: { sub?: string; role?: string },
    doctorId: string,
    dto: CreateConsultationDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const patientRows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId));
    if (!patientRows[0]) throw new NotFoundException('Patient not found');

    const visitRows = await this.db
      .select()
      .from(visits)
      .where(eq(visits.id, dto.visitId));
    if (!visitRows[0]) throw new NotFoundException('Visit not found');

    const now = new Date().toISOString();
    const consultationId = randomUUID();
    const effectiveDoctorId = dto.doctorId ?? visitRows[0].doctorId ?? doctorId;

    const consultRow = {
      id: consultationId,
      visitId: dto.visitId,
      patientId: dto.patientId,
      doctorId: effectiveDoctorId,
      chiefComplaints: dto.chiefComplaints ?? null,
      history: dto.history ?? null,
      vitalsJson: dto.vitals ? JSON.stringify(dto.vitals) : null,
      painScoreVas: dto.painScoreVas ?? null,
      soapNotesJson: dto.soapNotes ? JSON.stringify(dto.soapNotes) : null,
      diagnosisIcdJson: dto.diagnosis ? JSON.stringify(dto.diagnosis) : null,
      investigationsAdvisedJson: dto.investigations ? JSON.stringify(dto.investigations) : null,
      followUpDate: dto.followUpDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(consultations).values(consultRow);

    // Auto-create prescribed therapy plans
    const createdPlans = [];
    if (dto.therapyPlans && dto.therapyPlans.length > 0) {
      for (const plan of dto.therapyPlans) {
        const planId = randomUUID();
        const planRow = {
          id: planId,
          consultationId,
          visitId: dto.visitId,
          patientId: dto.patientId,
          doctorId: effectiveDoctorId,
          modalityCode: plan.modalityCode,
          totalSessionsPrescribed: plan.totalSessions,
          completedSessions: 0,
          frequency: plan.frequency ?? 'daily',
          notes: plan.notes ?? null,
          status: 'active' as const,
          createdAt: now,
          updatedAt: now,
        };
        await this.db.insert(therapyPlans).values(planRow);
        createdPlans.push(planRow);
      }
    }

    // Create prescription if items are advised
    let createdPrescription = null;
    if (dto.prescriptionItems && dto.prescriptionItems.length > 0) {
      const rxId = randomUUID();
      const rxRow = {
        id: rxId,
        consultationId,
        visitId: dto.visitId,
        patientId: dto.patientId,
        doctorId: effectiveDoctorId,
        advice: dto.generalAdvice ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.insert(prescriptions).values(rxRow);

      for (const item of dto.prescriptionItems) {
        await this.db.insert(prescriptionItems).values({
          id: randomUUID(),
          prescriptionId: rxId,
          medicineId: item.medicineId ?? null,
          medicineName: item.medicineName,
          dosage: item.dosage,
          durationDays: item.durationDays,
          instructionsBn: item.instructionsBn ?? null,
          instructionsEn: item.instructionsEn ?? null,
          isDispensed: 0,
        });
      }
      createdPrescription = rxRow;

      this.gateway.emit('clinic:global', 'prescription.created', {
        prescriptionId: rxId,
        visitId: dto.visitId,
        patientId: dto.patientId,
        doctorId: effectiveDoctorId,
      });
      this.realtime.publish('prescription.created', {
        prescriptionId: rxId,
        visitId: dto.visitId,
        patientId: dto.patientId,
      });
    }

    this.gateway.emit('clinic:global', 'consultation.saved', {
      consultationId,
      visitId: dto.visitId,
      patientId: dto.patientId,
      doctorId,
    });
    this.realtime.publish('consultation.saved', {
      consultationId,
      visitId: dto.visitId,
      patientId: dto.patientId,
    });

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'clinical.consultation_create',
      entity: 'consultations',
      entityId: consultationId,
      after: { consultRow, createdPlans, prescriptionId: createdPrescription?.id },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      ...consultRow,
      consultation: consultRow,
      therapyPlans: createdPlans,
      prescription: createdPrescription,
    };
  }

  async getConsultation(id: string) {
    const rows = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, id));
    const consult = rows[0];
    if (!consult) throw new NotFoundException('Consultation not found');

    const plans = await this.db
      .select()
      .from(therapyPlans)
      .where(eq(therapyPlans.consultationId, id));

    const rxRows = await this.db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.consultationId, id));

    let items: Array<typeof prescriptionItems.$inferSelect> = [];
    if (rxRows[0]) {
      items = await this.db
        .select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, rxRows[0].id));
    }

    return {
      ...consult,
      therapyPlans: plans,
      prescription: rxRows[0] ? { ...rxRows[0], items } : null,
    };
  }

  async getPatientConsultations(patientId: string) {
    const rows = await this.db
      .select({
        consultation: consultations,
        doctor: users,
      })
      .from(consultations)
      .leftJoin(users, eq(consultations.doctorId, users.id))
      .where(eq(consultations.patientId, patientId))
      .orderBy(desc(consultations.createdAt));

    return rows.map((r) => ({
      ...r.consultation,
      doctorName: r.doctor?.displayName ?? 'Unknown Doctor',
    }));
  }

  async getPrescription(id: string) {
    const rxRows = await this.db
      .select({
        prescription: prescriptions,
        patient: patients,
        doctor: users,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(prescriptions.patientId, patients.id))
      .innerJoin(users, eq(prescriptions.doctorId, users.id))
      .where(eq(prescriptions.id, id));

    const record = rxRows[0];
    if (!record) throw new NotFoundException('Prescription not found');

    const items = await this.db
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, id));

    return {
      ...record.prescription,
      patient: {
        id: record.patient.id,
        mrn: record.patient.mrn,
        nameEn: record.patient.nameEn,
        nameBn: record.patient.nameBn,
        ageYears: record.patient.ageYears,
        gender: record.patient.gender,
        phone: record.patient.phone,
      },
      doctor: {
        id: record.doctor.id,
        fullName: record.doctor.displayName,
        specialization: record.doctor.specialization,
      },
      items,
      printSpecs: {
        paperSize: '5.5in x 8.27in (140mm x 210mm)',
        clinicNameBn: 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর',
        clinicNameEn: 'HPC Health & Pain Care Center, Jashore',
        address: 'Jashore, Bangladesh',
        phone: '01XXXXXXXXX',
      },
    };
  }

  async createAssessment(
    actor: { sub?: string; role?: string },
    dto: CreateAssessmentDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      patientId: dto.patientId,
      consultationId: dto.consultationId ?? null,
      templateType: dto.templateType,
      scoreJson: JSON.stringify(dto.scoreJson),
      totalScore: dto.totalScore,
      outcomeNotes: dto.outcomeNotes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(assessments).values(row);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'clinical.assessment_create',
      entity: 'assessments',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }

  async getPatientAssessments(patientId: string) {
    return this.db
      .select()
      .from(assessments)
      .where(eq(assessments.patientId, patientId))
      .orderBy(desc(assessments.createdAt));
  }

  async createPrescription(
    actor: { sub?: string; role?: string },
    doctorId: string,
    dto: CreateStandalonePrescriptionDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const now = new Date().toISOString();
    const rxId = randomUUID();
    const effectiveDoctorId = dto.doctorId ?? doctorId;

    let consultId = dto.consultationId ?? null;
    if (!consultId) {
      const existingConsult = await this.db
        .select()
        .from(consultations)
        .where(eq(consultations.visitId, dto.visitId))
        .limit(1);
      if (existingConsult[0]) {
        consultId = existingConsult[0].id;
      }
    }

    const rxRow = {
      id: rxId,
      consultationId: consultId,
      visitId: dto.visitId,
      patientId: dto.patientId,
      doctorId: effectiveDoctorId,
      advice: dto.advice ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(prescriptions).values(rxRow);

    const items = dto.prescriptionItems ?? dto.medicines ?? [];
    const createdItems = [];
    for (const item of items) {
      const itemRow = {
        id: randomUUID(),
        prescriptionId: rxId,
        medicineId: item.medicineId ?? null,
        medicineName: item.medicineName ?? item.name ?? 'Unspecified Medicine',
        dosage: item.dosage ?? '1+0+1',
        durationDays: Number(item.durationDays ?? item.duration ?? 7),
        instructionsBn: item.instructionsBn ?? item.instructions ?? null,
        instructionsEn: item.instructionsEn ?? null,
        isDispensed: 0,
      };
      await this.db.insert(prescriptionItems).values(itemRow);
      createdItems.push(itemRow);
    }

    if (dto.modalities && dto.modalities.length > 0) {
      for (const mod of dto.modalities) {
        await this.db.insert(therapyPlans).values({
          id: randomUUID(),
          consultationId: consultId,
          visitId: dto.visitId,
          patientId: dto.patientId,
          doctorId: effectiveDoctorId,
          modalityCode: mod.modalityCode ?? mod.modalityId ?? mod.name,
          totalSessionsPrescribed: Number(mod.totalSessions ?? mod.sessions ?? 10),
          completedSessions: 0,
          frequency: mod.frequency ?? 'daily',
          notes: mod.notes ?? null,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'clinical.prescription_create',
      entity: 'prescriptions',
      entityId: rxId,
      after: { ...rxRow, items: createdItems },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      ...rxRow,
      items: createdItems,
    };
  }
}
