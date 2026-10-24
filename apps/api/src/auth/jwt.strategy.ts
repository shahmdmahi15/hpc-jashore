import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { refreshSessions, users } from '../db/schema';
import type { RequestUser } from '../rbac/current-user.decorator';

// Validates stateful session tokens: { sid, type:'access' }.
// Enforces 100% server-based stateful validation: checks database for active session,
// retrieves user record & role directly from DB in real-time,
// and auto-revokes if client fingerprint or User-Agent is mismatched.
@Injectable()
export class AccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    config: ConfigService,
    @Inject(DB) private readonly db: Db,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: Record<string, unknown>): Promise<RequestUser> {
    if (payload.type !== 'access' || typeof payload.sid !== 'string') {
      throw new UnauthorizedException('Invalid access token: missing session token');
    }

    const sid = payload.sid;

    // Fully server-based stateful validation:
    // 1. Session exists in database and is not revoked or expired
    const [session] = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.id, sid));

    if (!session) {
      throw new UnauthorizedException('Login session not found in database or has been deleted');
    }

    if (session.revokedAt !== null) {
      throw new UnauthorizedException('Login session has been revoked');
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Login session has expired');
    }

    // 2. Anti-hijacking security checks
    const incomingUa = (req?.headers?.['user-agent'] as string | undefined)?.trim();
    const incomingFingerprint = (
      (req?.headers?.['x-client-fingerprint'] as string | undefined) ||
      (req?.headers?.['x-fingerprint'] as string | undefined)
    )?.trim();

    if (session.userAgent && incomingUa && session.userAgent !== incomingUa) {
      await this.db
        .update(refreshSessions)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(refreshSessions.id, session.id));
      throw new UnauthorizedException('Security Alert: Session automatically revoked due to User-Agent mismatch');
    }

    if (session.fingerprint && incomingFingerprint && session.fingerprint !== incomingFingerprint) {
      await this.db
        .update(refreshSessions)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(refreshSessions.id, session.id));
      throw new UnauthorizedException('Security Alert: Session automatically revoked due to device fingerprint mismatch');
    }

    // 3. User verification dynamically from database
    const [user] = await this.db.select().from(users).where(eq(users.id, session.userId));
    if (!user || user.isActive !== 1) {
      throw new UnauthorizedException('User account has been deactivated, revoked, or no longer exists');
    }

    if (user.isApproved !== 1 || user.approvalStatus !== 'approved') {
      throw new ForbiddenException('User account is pending administrator approval or has been revoked');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role, // Live, realtime role from database! Instant reflection!
      staffId: user.id,
      sid: session.id,
    };
  }
}

// Validates 7-day refresh tokens from cookie or body: { sid, sub, type:'refresh' }.
@Injectable()
export class RefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService, private readonly jwt: JwtService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => (req?.cookies?.hpc_refresh as string | undefined) ?? null,
        (req) => (req?.body?.refreshToken as string | undefined) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(
    req: { cookies?: Record<string, string> },
    payload: Record<string, unknown>,
  ): { sid: string; sub: string; raw: string } {
    if (payload.type !== 'refresh' || typeof payload.sid !== 'string') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const raw =
      req.cookies?.hpc_refresh ??
      (req as unknown as { body?: { refreshToken?: string } }).body
        ?.refreshToken ??
      '';
    return { sid: String(payload.sid), sub: String(payload.sub), raw };
  }

  decodeRaw(raw: string): Record<string, unknown> {
    return (this.jwt.decode(raw) ?? {}) as Record<string, unknown>;
  }
}
