import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { RequestUser } from '../rbac/current-user.decorator';

// Validates 15-min access tokens: { sub, email, role, staffId, type:'access' }.
@Injectable()
export class AccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  validate(payload: Record<string, unknown>): RequestUser {
    // eslint-disable-next-line no-console
    console.log('[AccessStrategy validate called]', payload);
    if (payload.type !== 'access' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid access token');
    }
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      role: String(payload.role ?? ''),
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
