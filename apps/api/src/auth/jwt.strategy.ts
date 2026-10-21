import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { refreshSessions, users } from '../db/schema';
import type { RequestUser } from '../rbac/current-user.decorator';

// Validates 30-day session tokens: { sub, email, role, staffId, sid, type:'access' }.
// Enforces server-based stateful validation: checks database for active status, non-revoked session,
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
    if (payload.type !== 'access' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid access token');
    }

    // Stateful Session verification: If sid (session id) is present, verify session is active in DB
    if (typeof payload.sid === 'string' && payload.sid) {
      const [session] = await this.db
        .select()
        .from(refreshSessions)
        .where(eq(refreshSessions.id, payload.sid));

      if (!session) {
        throw new UnauthorizedException('Login session not found in database');
      }

      if (session.revokedAt !== null) {
        throw new UnauthorizedException('Login session has been revoked by an administrator');
      }

      if (new Date(session.expiresAt).getTime() < Date.now()) {
        throw new UnauthorizedException('Login session has expired');
      }

      // Security Check: Fingerprint & User-Agent verification.
      // Auto-revokes session immediately upon hijacking attempt / tampering.
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
    }

    // Server-based Stateful Verification: Verify user exists and is active in DB
    const [user] = await this.db.select().from(users).where(eq(users.id, payload.sub));
    if (!user || user.isActive !== 1) {
      throw new UnauthorizedException('User account has been deactivated, revoked, or no longer exists');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      staffId:
        typeof payload.staffId === 'string' ? payload.staffId : null,
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
