import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
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
import { RealtimeService } from '../realtime/realtime.service';
import { EventsGateway } from '../realtime/events.gateway';
import {
  authVerificationCodes,
  refreshSessions,
  users,
  type Role,
} from '../db/schema';
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
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    @Optional() private readonly realtime?: RealtimeService,
    @Optional() private readonly gateway?: EventsGateway,
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
    if (user.isApproved !== 1 || user.approvalStatus !== 'approved') {
      const reasonSuffix = user.rejectionReason ? ` (${user.rejectionReason})` : '';
      if (user.approvalStatus === 'rejected') {
        throw new ForbiddenException(
          `Your account registration was rejected by the administrator${reasonSuffix}. Please contact clinic administration. / আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা প্রত্যাখ্যাত হয়েছে।`,
        );
      }
      throw new ForbiddenException(
        'Your account is pending administrator approval before you can sign in. Please contact clinic administration. / আপনার অ্যাকাউন্টটি অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন পাওয়ার পর লগইন করতে পারবেন।',
      );
    }

    const sid = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sid, sub: user.id, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<number>('jwt.refreshTtlSeconds'),
      },
    );
    const accessToken = await this.accessTokenFor(sid);
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
      user: this.publicUser(user),
    };
  }

  private publicUser(
    user: typeof users.$inferSelect,
  ) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      staffId: user.id,
      mustChangePassword: user.mustChangePassword === 1,
      isApproved: user.isApproved === 1,
      approvalStatus: user.approvalStatus ?? 'approved',
    };
  }

  private accessTokenFor(sid: string) {
    return this.jwt.signAsync(
      { sid, type: 'access' },
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
    if (user.isApproved !== 1 || user.approvalStatus !== 'approved') {
      throw new ForbiddenException('Account pending approval or access revoked');
    }
    return this.publicUser(user);
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
    if (user.isApproved !== 1 || user.approvalStatus !== 'approved') {
      throw new ForbiddenException('Account pending approval or access revoked');
    }

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
      accessToken: await this.accessTokenFor(nextSid),
      refreshToken: nextRefresh,
      user: this.publicUser(user),
    };
  }

  async logout(raw: string | undefined, meta: ReqMeta) {
    if (!raw) return { ok: true };
    let sid: string | undefined;
    try {
      const decoded = this.jwt.decode(raw) as { sid?: string } | null;
      if (decoded?.sid) sid = decoded.sid;
      else if (typeof raw === 'string' && raw.length < 100) sid = raw;
    } catch {
      sid = raw;
    }
    if (!sid) return { ok: true };

    // Fully delete session from database on logout for true server-side stateful revocation
    await this.db
      .delete(refreshSessions)
      .where(eq(refreshSessions.id, sid));

    // Realtime notification of revoked session
    this.realtime?.publish('session.deleted', { sid });
    this.gateway?.emit('clinic:global', 'session.deleted', { sid });

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

    // Fully delete session from database for stateful server revocation
    await this.db
      .delete(refreshSessions)
      .where(eq(refreshSessions.id, sessionId));

    this.realtime?.publish('session.deleted', { sid: sessionId, userId: session.userId });
    this.gateway?.emit('clinic:global', 'session.deleted', { sid: sessionId, userId: session.userId });

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
      phone: dto.phone?.trim() ?? null,
      isActive: 0, // Unverified until verified via email
      mustChangePassword: 0,
      isApproved: 0,
      approvalStatus: 'pending',
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Trigger realtime notification to admin dashboard
    this.realtime?.publish('user.registered', {
      userId,
      email: normalized,
      displayName: dto.displayName.trim(),
      role,
      isApproved: 0,
      approvalStatus: 'pending',
    });
    this.gateway?.emit('clinic:global', 'user.registered', {
      userId,
      email: normalized,
      displayName: dto.displayName.trim(),
      role,
      isApproved: 0,
      approvalStatus: 'pending',
    });

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Clean up any prior pending codes for this email and insert new persistent code
    await this.db
      .delete(authVerificationCodes)
      .where(and(eq(authVerificationCodes.email, normalized), eq(authVerificationCodes.type, 'email_verification')));
    await this.db.insert(authVerificationCodes).values({
      id: randomUUID(),
      email: normalized,
      code,
      type: 'email_verification',
      expiresAt,
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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Clean up previous reset codes and insert persistent code
    await this.db
      .delete(authVerificationCodes)
      .where(and(eq(authVerificationCodes.email, normalized), eq(authVerificationCodes.type, 'password_reset')));
    await this.db.insert(authVerificationCodes).values({
      id: randomUUID(),
      email: normalized,
      code: pin,
      type: 'password_reset',
      expiresAt,
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
    const rowsCode = await this.db
      .select()
      .from(authVerificationCodes)
      .where(and(eq(authVerificationCodes.email, normalized), eq(authVerificationCodes.type, 'password_reset')));
    const codeRecord = rowsCode[0];

    const nowIso = new Date().toISOString();
    if (!codeRecord || codeRecord.code !== dto.code.trim() || codeRecord.expiresAt < nowIso) {
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

    // Delete used code
    await this.db
      .delete(authVerificationCodes)
      .where(and(eq(authVerificationCodes.email, normalized), eq(authVerificationCodes.type, 'password_reset')));

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
    const rowsCode = await this.db
      .select()
      .from(authVerificationCodes)
      .where(and(eq(authVerificationCodes.email, normalized), eq(authVerificationCodes.type, 'email_verification')));
    const codeRecord = rowsCode[0];

    const nowIso = new Date().toISOString();
    if (!codeRecord || codeRecord.code !== dto.code.trim() || codeRecord.expiresAt < nowIso) {
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

    // Delete used code
    await this.db
      .delete(authVerificationCodes)
      .where(and(eq(authVerificationCodes.email, normalized), eq(authVerificationCodes.type, 'email_verification')));

    const isApproved = user?.isApproved === 1;
    return {
      success: true,
      message: isApproved
        ? 'Email successfully verified. Your account is active.'
        : 'Email successfully verified. Your account is pending administrator approval before login. / ইমেইল যাচাই সম্পন্ন হয়েছে। অ্যাডমিন অনুমোদনের পর আপনি লগইন করতে পারবেন।',
    };
  }

  async resendVerification(email: string, meta: ReqMeta) {
    const normalized = email.trim().toLowerCase();
    const rows = await this.db.select().from(users).where(eq(users.email, normalized));
    const user = rows[0];

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.db
      .delete(authVerificationCodes)
      .where(and(eq(authVerificationCodes.email, normalized), eq(authVerificationCodes.type, 'email_verification')));
    await this.db.insert(authVerificationCodes).values({
      id: randomUUID(),
      email: normalized,
      code,
      type: 'email_verification',
      expiresAt,
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
