import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { refreshSessions, users } from '../db/schema';
import type { RequestUser } from '../rbac/current-user.decorator';

// Validates 15-min access tokens: { sub, email, role, staffId, sid, type:'access' }.
// Enforces server-based stateful validation: checks database for active status and non-revoked session.
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
    });
  }

  async validate(payload: Record<string, unknown>): Promise<RequestUser> {
    if (payload.type !== 'access' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid access token');
    }

    // Server-based Stateful Verification: Verify user exists and is active in DB
    const [user] = await this.db.select().from(users).where(eq(users.id, payload.sub));
    if (!user || user.isActive !== 1) {
      throw new UnauthorizedException('User account has been deactivated, revoked, or no longer exists');
    }

    // Stateful Session verification: If sid (session id) is present, verify session is not revoked
    if (typeof payload.sid === 'string' && payload.sid) {
      const [session] = await this.db
        .select()
        .from(refreshSessions)
        .where(eq(refreshSessions.id, payload.sid));

      if (!session || session.revokedAt !== null) {
        throw new UnauthorizedException('Login session has been revoked by an administrator');
      }
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
