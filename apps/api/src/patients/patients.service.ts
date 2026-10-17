import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, like, or, count } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { nextMrn } from '../common/mrn.util';
import { paged } from '../common/pagination.dto';
import { DB, type Db } from '../db/db.module';
import {
  dues,
  packageCredits,
  patients,
  visits,
} from '../db/schema';
import type { CreatePatientDto, UpdatePatientDto } from './dto';

@Injectable()
export class PatientsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async search(q?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const cleanQ = q?.trim();

    let whereClause = isNull(patients.deletedAt);
    if (cleanQ) {
      const pattern = `%${cleanQ}%`;
      whereClause = and(
        isNull(patients.deletedAt),
        or(
          like(patients.mrn, pattern),
          like(patients.phone, pattern),
          like(patients.nameEn, pattern),
          like(patients.nameBn, pattern),
        ),
      )!;
    }

    const rows = await this.db
      .select()
      .from(patients)
      .where(whereClause)
      .orderBy(desc(patients.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(patients)
      .where(whereClause);

    return paged(rows, total, page, limit);
  }

  async create(
    actor: { sub?: string; role?: string },
    dto: CreatePatientDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const existing = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.phone, dto.phone), isNull(patients.deletedAt)));
    if (existing.length > 0) {
      throw new BadRequestException('A patient with this phone number is already registered');
    }

    const year = new Date().getFullYear();
    const mrn = nextMrn(this.db, year);

    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      mrn,
      nameEn: dto.nameEn.trim(),
      nameBn: dto.nameBn?.trim() ?? null,
      phone: dto.phone.trim(),
      dateOfBirth: dto.dateOfBirth ?? null,
      ageYears: dto.ageYears ?? null,
      gender: dto.gender,
      bloodGroup: dto.bloodGroup?.trim().toUpperCase() ?? null,
      address: dto.address?.trim() ?? null,
      occupation: dto.occupation?.trim() ?? null,
      emergencyContact: dto.emergencyContact?.trim() ?? null,
      allergies: dto.allergies?.trim() ?? null,
      chronicConditions: dto.chronicConditions?.trim() ?? null,
      contraindications: dto.contraindications?.trim() ?? null,
      photoUrl: null,
      consentSigned: 0,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(patients).values(row);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'patients.create',
      entity: 'patients',
      entityId: row.id,
      after: row,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return row;
  }

  async get(id: string) {
    const rows = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)));
    const patient = rows[0];
    if (!patient) throw new NotFoundException('Patient not found');

    const patientVisits = await this.db
      .select()
      .from(visits)
      .where(eq(visits.patientId, id))
      .orderBy(desc(visits.visitDate))
      .limit(10);

    const credits = await this.db
      .select()
      .from(packageCredits)
      .where(and(eq(packageCredits.patientId, id), eq(packageCredits.status, 'active')));

    const patientDues = await this.db
      .select()
      .from(dues)
      .where(and(eq(dues.patientId, id), eq(dues.status, 'pending')));

    return {
      ...patient,
      visits: patientVisits,
      activePackageCredits: credits,
      outstandingDues: patientDues,
    };
  }

  async update(
    actor: { sub?: string; role?: string },
    id: string,
    dto: UpdatePatientDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const before = await this.get(id);

    const patch: Partial<typeof patients.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (dto.nameEn !== undefined) patch.nameEn = dto.nameEn.trim();
    if (dto.nameBn !== undefined) patch.nameBn = dto.nameBn.trim();
    if (dto.phone !== undefined) {
      const conflict = await this.db
        .select()
        .from(patients)
        .where(and(eq(patients.phone, dto.phone.trim()), isNull(patients.deletedAt)));
      if (conflict[0] && conflict[0].id !== id) {
        throw new BadRequestException('Another patient is registered with this phone number');
      }
      patch.phone = dto.phone.trim();
    }
    if (dto.dateOfBirth !== undefined) patch.dateOfBirth = dto.dateOfBirth;
    if (dto.ageYears !== undefined) patch.ageYears = dto.ageYears;
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.bloodGroup !== undefined) patch.bloodGroup = dto.bloodGroup.trim().toUpperCase();
    if (dto.address !== undefined) patch.address = dto.address.trim();
    if (dto.occupation !== undefined) patch.occupation = dto.occupation.trim();
    if (dto.emergencyContact !== undefined) patch.emergencyContact = dto.emergencyContact.trim();
    if (dto.allergies !== undefined) patch.allergies = dto.allergies.trim();
    if (dto.chronicConditions !== undefined) patch.chronicConditions = dto.chronicConditions.trim();
    if (dto.contraindications !== undefined) patch.contraindications = dto.contraindications.trim();
    if (dto.consentSigned !== undefined) patch.consentSigned = dto.consentSigned ? 1 : 0;

    await this.db.update(patients).set(patch).where(eq(patients.id, id));
    const after = await this.get(id);

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'patients.update',
      entity: 'patients',
      entityId: id,
      before,
      after,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return after;
  }

  async remove(
    actor: { sub?: string; role?: string },
    id: string,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    const before = await this.get(id);
    const now = new Date().toISOString();
    await this.db
      .update(patients)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(patients.id, id));

    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'patients.soft_delete',
      entity: 'patients',
      entityId: id,
      before,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { ok: true, deletedAt: now };
  }
}
