import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { DB, type Db } from '../db/db.module';
import { MailService } from '../mail/mail.service';
import {
  actionGrants,
  desks,
  pinCredentials,
  refreshSessions,
  staff,
  users,
  type Role,
} from '../db/schema';
import { validatePinPolicy } from './pin.util';
import { hashToken } from './token.util';
import type { RegisterDto, ResetPasswordDto, VerifyEmailDto } from './dto';

const FAILED_LIMIT = 5;
const LOCK_MS = 15 * 60 * 1000;

interface ReqMeta {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

@Injectable()
export class AuthService {
  private readonly passwordResetCodes = new Map<string, { code: string; expiresAt: number }>();
  private readonly emailVerificationCodes = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  // --- Personal login ---------------------------------------------------------

  async login(
    email: string,
    password: string,
    deviceLabel: string | undefined,
    meta: ReqMeta,
  ) {
    const normalized = email.trim().toLowerCase();
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalized));
    const user = rows[0];
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await this.audit.log({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.login_failed',
        entity: 'users',
        entityId: user.id,
        ip: meta.ip,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.isActive !== 1) {
      throw new UnauthorizedException(
        'Your email address is not verified. Please check your inbox or click Resend Verification to activate your account.',
      );
    }

    const staffRow = (
      await this.db.select().from(staff).where(eq(staff.userId, user.id))
    )[0];

    const sid = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sid, sub: user.id, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<number>('jwt.refreshTtlSeconds'),
      },
    );
    const accessToken = await this.accessTokenFor(
      user.id,
      user.email,
      user.role as Role,
      staffRow?.id ?? null,
      sid,
    );
    const expiresAt = new Date(
      Date.now() + this.config.get<number>('jwt.refreshTtlSeconds')! * 1000,
    ).toISOString();
    await this.db.insert(refreshSessions).values({
      id: sid,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      deviceLabel: deviceLabel ?? null,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      fingerprint: (meta as any)?.fingerprint ?? null,
      expiresAt,
      revokedAt: null,
      rotatedFromId: null,
    });
    await this.audit.log({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.login',
      entity: 'users',
      entityId: user.id,
      after: { sid, deviceLabel: deviceLabel ?? null },
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return {
      accessToken,
      refreshToken,
      user: this.publicUser(user, staffRow?.id ?? null),
    };
  }

  private publicUser(
    user: typeof users.$inferSelect,
    staffId: string | null,
  ) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      staffId,
      mustChangePassword: user.mustChangePassword === 1,
    };
  }

  private accessTokenFor(
    sub: string,
    email: string,
    role: Role,
    staffId: string | null,
    sid?: string | null,
  ) {
    return this.jwt.signAsync(
      { sub, email, role, staffId, sid: sid ?? null, type: 'access' },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.config.get<number>('jwt.accessTtlSeconds'),
      },
    );
  }

  async me(userId: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    const user = rows[0];
    if (!user || user.isActive !== 1) {
      throw new UnauthorizedException('Account unavailable');
    }
    const staffRow = (
      await this.db.select().from(staff).where(eq(staff.userId, user.id))
    )[0];
    return this.publicUser(user, staffRow?.id ?? null);
  }

  // Rotates a refresh token: revokes the old session row, inserts the next.
  // Reuse of an already-rotated token revokes the whole chain (theft signal).
  async refresh(raw: string, meta: ReqMeta) {
    const sid = (
      (this.jwt.decode(raw) ?? {}) as { sid?: string; sub?: string }
    ).sid;
    if (!sid) throw new UnauthorizedException('Invalid refresh token');
    const rows = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.id, sid));
    const session = rows[0];
    if (!session) throw new UnauthorizedException('Session not found');

    if (session.revokedAt) {
      await this.db
        .update(refreshSessions)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(refreshSessions.userId, session.userId));
      await this.audit.log({
        actorUserId: session.userId,
        action: 'auth.refresh_reuse',
        entity: 'refresh_sessions',
        entityId: sid,
        ip: meta.ip,
        requestId: meta.requestId,
      });
      throw new UnauthorizedException('Refresh token reused');
    }
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    if (hashToken(raw) !== session.tokenHash) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const userRows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));
    const user = userRows[0];
    if (!user || user.isActive !== 1) {
      throw new UnauthorizedException('Account unavailable');
    }
    const staffRow = (
      await this.db.select().from(staff).where(eq(staff.userId, user.id))
    )[0];

    const nextSid = randomUUID();
    const nextRefresh = await this.jwt.signAsync(
      { sid: nextSid, sub: user.id, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<number>('jwt.refreshTtlSeconds'),
      },
    );
    const nowIso = new Date().toISOString();
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: nowIso })
      .where(eq(refreshSessions.id, sid));
    await this.db.insert(refreshSessions).values({
      id: nextSid,
      userId: user.id,
      tokenHash: hashToken(nextRefresh),
      deviceLabel: session.deviceLabel,
      ip: meta.ip ?? session.ip,
      userAgent: meta.userAgent ?? session.userAgent,
      expiresAt: new Date(
        Date.now() + this.config.get<number>('jwt.refreshTtlSeconds')! * 1000,
      ).toISOString(),
      revokedAt: null,
      rotatedFromId: sid,
    });
    return {
      accessToken: await this.accessTokenFor(
        user.id,
        user.email,
        user.role as Role,
        staffRow?.id ?? null,
        nextSid,
      ),
      refreshToken: nextRefresh,
      user: this.publicUser(user, staffRow?.id ?? null),
    };
  }

  async logout(raw: string | undefined, meta: ReqMeta) {
    if (!raw) return { ok: true };
    const sid = ((this.jwt.decode(raw) ?? {}) as { sid?: string }).sid;
    if (!sid) return { ok: true };
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(refreshSessions.id, sid));
    await this.audit.log({
      action: 'auth.logout',
      entity: 'refresh_sessions',
      entityId: sid,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return { ok: true };
  }

  async mySessions(userId: string) {
    const rows = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.userId, userId));
    return rows.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      ip: s.ip,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      current: false,
    }));
  }

  async revokeSession(
    actor: { sub: string; role: string },
    sessionId: string,
    meta: ReqMeta,
  ) {
    const rows = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.id, sessionId));
    const session = rows[0];
    if (!session) throw new UnauthorizedException('Session not found');
    if (actor.role !== 'admin' && session.userId !== actor.sub) {
      throw new ForbiddenException('Cannot revoke another user session');
    }
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(refreshSessions.id, sessionId));
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'auth.session_revoke',
      entity: 'refresh_sessions',
      entityId: sessionId,
      before: { userId: session.userId },
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return { ok: true };
  }

  // --- Desk PIN ---------------------------------------------------------------

  async pinVerify(
    input: {
      deskCode: string;
      staffId: string;
      pin: string;
      idempotencyKey?: string;
    },
    meta: ReqMeta,
  ) {
    const deskRows = await this.db
      .select()
      .from(desks)
      .where(eq(desks.code, input.deskCode));
    const desk = deskRows[0];
    if (!desk || desk.isActive !== 1) {
      throw new BadRequestException('Unknown or inactive desk');
    }
    const staffRows = await this.db
      .select()
      .from(staff)
      .where(eq(staff.id, input.staffId));
    const member = staffRows[0];
    if (!member || member.isActive !== 1) {
      throw new BadRequestException('Unknown or inactive staff');
    }

    // Idempotent retry: same key returns a fresh short-lived JWT for the same
    // grant (same jti), with no counter changes — safe against double-taps.
    if (input.idempotencyKey) {
      const prior = await this.db
        .select()
        .from(actionGrants)
        .where(eq(actionGrants.idempotencyKey, input.idempotencyKey));
      const hit = prior[0];
      if (hit) {
        const remainingMs =
          new Date(hit.expiresAt).getTime() - Date.now();
        if (remainingMs <= 0) {
          throw new UnauthorizedException('Grant expired — verify PIN again');
        }
        const staffHit = (
          await this.db.select().from(staff).where(eq(staff.id, hit.staffId))
        )[0];
        const replayToken = await this.jwt.signAsync(
          {
            jti: hit.id,
            staffId: hit.staffId,
            deskId: hit.deskId,
            deskCode: desk.code,
            scope: hit.scope,
            type: 'grant',
          },
          {
            secret: this.config.getOrThrow<string>('jwt.grantSecret'),
            expiresIn: Math.floor(remainingMs / 1000),
          },
        );
        return {
          grantToken: replayToken,
          expiresAt: hit.expiresAt,
          staff: {
            id: hit.staffId,
            fullName: staffHit?.fullName ?? 'unknown',
            role: staffHit?.role ?? 'unknown',
          },
          desk: { id: desk.id, code: desk.code, type: desk.type },
          idempotencyKey: hit.idempotencyKey,
          replayed: true,
        };
      }
    }

    const credRows = await this.db
      .select()
      .from(pinCredentials)
      .where(eq(pinCredentials.staffId, member.id));
    const cred = credRows[0];
    if (cred?.lockedUntil && new Date(cred.lockedUntil).getTime() > Date.now()) {
      throw new HttpException('PIN locked — try again later', HttpStatus.LOCKED);
    }
    const ok = cred
      ? await bcrypt.compare(input.pin, cred.pinHash)
      : false;
    if (!ok) {
      const failed = (cred?.failedAttempts ?? 0) + 1;
      const locked = failed >= FAILED_LIMIT;
      if (cred) {
        await this.db
          .update(pinCredentials)
          .set({
            failedAttempts: failed,
            lockedUntil: locked
              ? new Date(Date.now() + LOCK_MS).toISOString()
              : null,
          })
          .where(eq(pinCredentials.staffId, member.id));
      }
      await this.audit.log({
        deskId: desk.id,
        pinStaffId: member.id,
        action: locked ? 'auth.pin_locked' : 'auth.pin_failed',
        entity: 'staff',
        entityId: member.id,
        after: { failedAttempts: failed },
        ip: meta.ip,
        requestId: meta.requestId,
      });
      if (locked) throw new HttpException('Too many wrong PINs — locked 15 min', HttpStatus.LOCKED);
      throw new UnauthorizedException('Wrong PIN');
    }

    await this.db
      .update(pinCredentials)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(pinCredentials.staffId, member.id));

    const jti = randomUUID();
    const issuedAt = Date.now();
    const ttl = this.config.get<number>('jwt.grantTtlSeconds') ?? 60;
    const expiresAt = new Date(issuedAt + ttl * 1000).toISOString();
    const idempotencyKey = input.idempotencyKey ?? randomUUID();
    const row = {
      id: jti,
      staffId: member.id,
      deskId: desk.id,
      scope: 'desk:action' as const,
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt,
      usedAt: null,
      idempotencyKey,
    };
    await this.db.insert(actionGrants).values(row);
    await this.audit.log({
      actorRole: member.role,
      deskId: desk.id,
      pinStaffId: member.id,
      action: 'auth.pin_verify',
      entity: 'staff',
      entityId: member.id,
      after: { deskCode: desk.code, jti },
      ip: meta.ip,
      requestId: meta.requestId,
    });

    const grantToken = await this.jwt.signAsync(
      {
        jti,
        staffId: member.id,
        deskId: desk.id,
        deskCode: desk.code,
        scope: 'desk:action',
        type: 'grant',
      },
      {
        secret: this.config.getOrThrow<string>('jwt.grantSecret'),
        expiresIn: ttl,
      },
    );
    return {
      grantToken,
      expiresAt,
      staff: { id: member.id, fullName: member.fullName, role: member.role },
      desk: { id: desk.id, code: desk.code, type: desk.type },
      idempotencyKey,
      replayed: false,
    };
  }

  async pinReset(
    actor: { sub: string },
    staffId: string,
    newPin: string,
    meta: ReqMeta,
  ) {
    const policyError = validatePinPolicy(newPin);
    if (policyError) throw new BadRequestException(policyError);
    const staffRows = await this.db
      .select()
      .from(staff)
      .where(eq(staff.id, staffId));
    if (!staffRows[0]) throw new BadRequestException('Unknown staff');
    const hash = await bcrypt.hash(newPin, 10);
    const existing = await this.db
      .select()
      .from(pinCredentials)
      .where(eq(pinCredentials.staffId, staffId));
    if (existing.length > 0) {
      await this.db
        .update(pinCredentials)
        .set({
          pinHash: hash,
          failedAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date().toISOString(),
          updatedBy: actor.sub,
        })
        .where(eq(pinCredentials.staffId, staffId));
    } else {
      await this.db.insert(pinCredentials).values({
        staffId,
        pinHash: hash,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.sub,
      });
    }
    await this.audit.log({
      actorUserId: actor.sub,
      actorRole: 'admin',
      pinStaffId: staffId,
      action: 'auth.pin_reset',
      entity: 'staff',
      entityId: staffId,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return { ok: true };
  }

  // --- Registration & Email Verification & Password Reset ---

  async register(dto: RegisterDto, meta: ReqMeta) {
    const normalized = dto.email.trim().toLowerCase();
    const existing = await this.db.select().from(users).where(eq(users.email, normalized));
    if (existing.length > 0) {
      throw new BadRequestException('An account with this email already exists.');
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    // Privilege escalation prevention: self-registration defaults to receptionist.
    const role: Role = 'receptionist';

    await this.db.insert(users).values({
      id: userId,
      email: normalized,
      passwordHash,
      role,
      displayName: dto.displayName.trim(),
      isActive: 0, // Unverified until verified via email
      mustChangePassword: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (dto.phone) {
      await this.db.insert(staff).values({
        id: randomUUID(),
        userId,
        fullName: dto.displayName.trim(),
        role: (['admin', 'doctor', 'handler', 'cashier', 'receptionist'].includes(role) ? role : 'receptionist') as Role,
        phone: dto.phone.trim(),
        isActive: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailVerificationCodes.set(normalized, {
      code,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Send verification email asynchronously
    this.mail.sendVerificationCode(normalized, code, dto.displayName).catch(() => {});

    await this.audit.log({
      actorUserId: userId,
      actorRole: role,
      action: 'auth.register',
      entity: 'user',
      entityId: userId,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      success: true,
      message: 'Account successfully registered. A verification code has been dispatched to your email.',
      userId,
    };
  }

  async forgotPassword(email: string, meta: ReqMeta) {
    const normalized = email.trim().toLowerCase();
    const rows = await this.db.select().from(users).where(eq(users.email, normalized));
    const user = rows[0];

    // Generate 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.passwordResetCodes.set(normalized, {
      code: pin,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    if (user) {
      await this.mail.sendPasswordResetPin(normalized, pin, user.displayName);
      await this.audit.log({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.forgot_password_requested',
        entity: 'user',
        entityId: user.id,
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    return {
      success: true,
      message: 'If an account exists with this email, a 6-digit password reset PIN has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto, meta: ReqMeta) {
    const normalized = dto.email.trim().toLowerCase();
    const cached = this.passwordResetCodes.get(normalized);

    if (!cached || cached.code !== dto.code.trim() || cached.expiresAt < Date.now()) {
      throw new BadRequestException('Invalid or expired password reset PIN.');
    }

    const rows = await this.db.select().from(users).where(eq(users.email, normalized));
    const user = rows[0];
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: 0,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    this.passwordResetCodes.delete(normalized);

    await this.audit.log({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.password_reset_completed',
      entity: 'user',
      entityId: user.id,
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      success: true,
      message: 'Your password has been reset successfully. You can now log in with your new credentials.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto, meta: ReqMeta) {
    const normalized = dto.email.trim().toLowerCase();
    const cached = this.emailVerificationCodes.get(normalized);

    if (!cached || cached.code !== dto.code.trim() || cached.expiresAt < Date.now()) {
      throw new BadRequestException('Invalid or expired email verification code.');
    }

    const rows = await this.db.select().from(users).where(eq(users.email, normalized));
    const user = rows[0];
    if (user) {
      await this.db
        .update(users)
        .set({
          isActive: 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));

      await this.db
        .update(staff)
        .set({
          isActive: 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(staff.userId, user.id));

      await this.audit.log({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.email_verified',
        entity: 'user',
        entityId: user.id,
        ip: meta.ip,
        requestId: meta.requestId,
      });
    }

    this.emailVerificationCodes.delete(normalized);

    return {
      success: true,
      message: 'Email successfully verified. Your account is active.',
    };
  }

  async resendVerification(email: string, meta: ReqMeta) {
    const normalized = email.trim().toLowerCase();
    const rows = await this.db.select().from(users).where(eq(users.email, normalized));
    const user = rows[0];

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailVerificationCodes.set(normalized, {
      code,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    if (user) {
      await this.mail.sendVerificationCode(normalized, code, user.displayName);
    }

    return {
      success: true,
      message: 'A fresh verification code has been dispatched to your email.',
    };
  }
}
