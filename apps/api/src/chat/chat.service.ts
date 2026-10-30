import { Inject, Injectable, Optional } from '@nestjs/common';
import { and, asc, desc, eq, isNull, like, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { chatMessages, patients, users } from '../db/schema';
import { EventsGateway } from '../realtime/events.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import type { SendMessageDto } from './dto';

@Injectable()
export class ChatService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    @Optional() private readonly gateway?: EventsGateway,
  ) {}

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
    if (!val) return fallback;
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * List all chat messages for a specific date (YYYY-MM-DD), ordered by createdAt ASC.
   * Joins patient info when patientId is present.
   */
  async listMessagesByDate(date?: string) {
    const targetDate = (date && date.trim()) || this.getTodayDate();

    const rows = await this.db
      .select({
        id: chatMessages.id,
        chatDate: chatMessages.chatDate,
        senderUserId: chatMessages.senderUserId,
        senderName: chatMessages.senderName,
        senderRole: chatMessages.senderRole,
        content: chatMessages.content,
        priority: chatMessages.priority,
        messageType: chatMessages.messageType,
        patientId: chatMessages.patientId,
        patientMrn: chatMessages.patientMrn,
        patientName: chatMessages.patientName,
        mentions: chatMessages.mentions,
        metadata: chatMessages.metadata,
        createdAt: chatMessages.createdAt,
        updatedAt: chatMessages.updatedAt,
        patientDetails: {
          id: patients.id,
          mrn: patients.mrn,
          nameEn: patients.nameEn,
          nameBn: patients.nameBn,
          phone: patients.phone,
          ageYears: patients.ageYears,
          gender: patients.gender,
        },
      })
      .from(chatMessages)
      .leftJoin(patients, eq(chatMessages.patientId, patients.id))
      .where(eq(chatMessages.chatDate, targetDate))
      .orderBy(asc(chatMessages.createdAt));

    return rows.map((r) => {
      const mentions = this.safeJsonParse<string[]>(r.mentions, []);
      const metadata = this.safeJsonParse<Record<string, any> | null>(r.metadata, null);

      return {
        id: r.id,
        chatDate: r.chatDate,
        senderUserId: r.senderUserId,
        senderName: r.senderName,
        senderRole: r.senderRole,
        content: r.content,
        priority: r.priority,
        messageType: r.messageType,
        patientId: r.patientId,
        patientMrn: r.patientMrn,
        patientName: r.patientName,
        mentions,
        metadata,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        patient: r.patientDetails?.id
          ? {
              id: r.patientDetails.id,
              mrn: r.patientDetails.mrn,
              nameEn: r.patientDetails.nameEn,
              nameBn: r.patientDetails.nameBn,
              phone: r.patientDetails.phone,
              ageYears: r.patientDetails.ageYears,
              gender: r.patientDetails.gender,
            }
          : r.patientId
            ? {
                id: r.patientId,
                mrn: r.patientMrn,
                nameEn: r.patientName,
              }
            : null,
      };
    });
  }

  /**
   * Get distinct dates where messages have been posted, up to 30 latest dates.
   */
  async getAvailableDates(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ chatDate: chatMessages.chatDate })
      .from(chatMessages)
      .orderBy(desc(chatMessages.chatDate))
      .limit(30);

    const dates = rows.map((r) => r.chatDate);
    const today = this.getTodayDate();
    if (!dates.includes(today)) {
      return [today, ...dates];
    }
    return dates;
  }

  /**
   * Send a new message:
   * - Look up sender's latest displayName and role
   * - Resolve patient link via patientId or auto-detect #MRN in content
   * - Insert into SQLite
   * - Realtime broadcast via EventsGateway and RealtimeService SSE
   * - Log audit trail
   */
  async sendMessage(
    actor: { sub: string; role: string },
    dto: SendMessageDto,
    meta: { ip?: string | null; requestId?: string | null },
  ) {
    // 1. Get sender display details
    const [senderUser] = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, actor.sub));

    const senderName = senderUser?.displayName || 'Staff Member';
    const senderRole = senderUser?.role || actor.role;

    // 2. Resolve chat date
    const chatDate = dto.chatDate?.trim() || this.getTodayDate();

    // 3. Resolve patient link
    let patientId = dto.patientId?.trim() || null;
    let patientMrn: string | null = null;
    let patientName: string | null = null;
    let resolvedPatientObj: any = null;

    if (patientId) {
      const [patient] = await this.db
        .select({
          id: patients.id,
          mrn: patients.mrn,
          nameEn: patients.nameEn,
          nameBn: patients.nameBn,
          phone: patients.phone,
          ageYears: patients.ageYears,
          gender: patients.gender,
        })
        .from(patients)
        .where(eq(patients.id, patientId));

      if (patient) {
        patientMrn = patient.mrn;
        patientName = patient.nameEn;
        resolvedPatientObj = patient;
      }
    } else {
      // Auto-detect #MRN pattern in content (e.g. #HPC-2026-0001 or #2026-0001)
      const mrnMatch = dto.content.match(/#([A-Za-z0-9-]+)/);
      if (mrnMatch && mrnMatch[1]) {
        const potentialMrn = mrnMatch[1].trim();
        const [patient] = await this.db
          .select({
            id: patients.id,
            mrn: patients.mrn,
            nameEn: patients.nameEn,
            nameBn: patients.nameBn,
            phone: patients.phone,
            ageYears: patients.ageYears,
            gender: patients.gender,
          })
          .from(patients)
          .where(
            or(
              eq(patients.mrn, potentialMrn),
              like(patients.mrn, `%${potentialMrn}%`),
              eq(patients.legacyId, potentialMrn),
              like(patients.legacyId, `%${potentialMrn}%`),
            ),
          )
          .limit(1);

        if (patient) {
          patientId = patient.id;
          patientMrn = patient.mrn;
          patientName = patient.nameEn;
          resolvedPatientObj = patient;
        }
      }
    }

    // 4. Resolve message type
    let messageType = dto.messageType || 'text';
    if (!dto.messageType && patientId) {
      messageType = 'patient_mention';
    }

    // 5. Build and insert row
    const id = randomUUID();
    const now = new Date().toISOString();
    const mentionsJson =
      dto.mentions && Array.isArray(dto.mentions) && dto.mentions.length > 0
        ? JSON.stringify(dto.mentions)
        : null;
    const metadataJson =
      dto.metadata && typeof dto.metadata === 'object'
        ? JSON.stringify(dto.metadata)
        : null;

    const [inserted] = await this.db
      .insert(chatMessages)
      .values({
        id,
        chatDate,
        senderUserId: actor.sub,
        senderName,
        senderRole,
        content: dto.content.trim(),
        priority: dto.priority || 'normal',
        messageType,
        patientId,
        patientMrn,
        patientName,
        mentions: mentionsJson,
        metadata: metadataJson,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const resultMessage = {
      ...inserted,
      mentions: dto.mentions || [],
      metadata: dto.metadata || null,
      patient:
        resolvedPatientObj ||
        (patientId
          ? {
              id: patientId,
              mrn: patientMrn,
              nameEn: patientName,
            }
          : null),
    };

    // 6. Realtime broadcasts (Socket.IO + SSE)
    try {
      this.gateway?.emit('clinic:global', 'chat.message', resultMessage);
      this.realtime.publish('chat.message', resultMessage);
    } catch (realtimeErr) {
      console.error('Failed to emit chat.message event:', realtimeErr);
    }

    // 7. Audit logging
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'chat.message.send',
      entity: 'chat_messages',
      entityId: id,
      after: resultMessage,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return resultMessage;
  }

  /**
   * Autocomplete search for mentions:
   * - 'user': active staff/users matching displayName, email, or role
   * - 'patient': active patients matching name, MRN, or phone
   */
  async searchMentions(type: 'patient' | 'user', q: string) {
    const query = (q || '').trim();
    const pattern = `%${query}%`;

    if (type === 'user') {
      const qb = this.db
        .select({
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          role: users.role,
          phone: users.phone,
          chamberRoomId: users.chamberRoomId,
        })
        .from(users)
        .where(
          query
            ? and(
                eq(users.isActive, 1),
                or(
                  like(users.displayName, pattern),
                  like(users.email, pattern),
                  like(users.role, pattern),
                ),
              )
            : eq(users.isActive, 1),
        )
        .limit(20);
      return qb;
    }

    if (type === 'patient') {
      const patientRows = await this.db
        .select({
          id: patients.id,
          mrn: patients.mrn,
          legacyId: patients.legacyId,
          nameEn: patients.nameEn,
          nameBn: patients.nameBn,
          phone: patients.phone,
          ageYears: patients.ageYears,
          gender: patients.gender,
          address: patients.address,
        })
        .from(patients)
        .where(
          query
            ? and(
                isNull(patients.deletedAt),
                or(
                  like(patients.nameEn, pattern),
                  like(patients.nameBn, pattern),
                  like(patients.mrn, pattern),
                  like(patients.legacyId, pattern),
                  like(patients.phone, pattern),
                  like(patients.address, pattern),
                ),
              )
            : isNull(patients.deletedAt),
        )
        .orderBy(desc(patients.createdAt))
        .limit(20);

      return patientRows.map((p) => {
        const displayName = p.nameBn && p.nameEn ? `${p.nameBn} (${p.nameEn})` : (p.nameBn || p.nameEn || 'Patient');
        return {
          id: p.id,
          mrn: p.mrn,
          name: displayName,
          nameEn: p.nameEn,
          nameBn: p.nameBn,
          phone: p.phone,
          gender: p.gender,
          age: p.ageYears,
        };
      });
    }

    return [];
  }
}
