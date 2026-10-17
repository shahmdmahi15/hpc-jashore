// Single-use-capable guard for 60 s desk action grants (X-Action-Grant header).
// Grants are minted by POST /auth/pin-verify after staff selector + PIN.
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { actionGrants } from '../db/schema';

export interface GrantClaims {
  jti: string;
  staffId: string;
  deskId: string;
  deskCode: string;
  scope: string;
}

@Injectable()
export class GrantGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(DB) private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const raw =
      (req.header('x-action-grant') as string | undefined) ??
      (req.body?.grantToken as string | undefined);
    if (!raw) throw new UnauthorizedException('Action grant required');
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        raw,
        { secret: this.config.getOrThrow<string>('jwt.grantSecret') },
      );
      if (payload.type !== 'grant' || typeof payload.jti !== 'string') {
        throw new UnauthorizedException('Invalid action grant');
      }
      const grantId = String(payload.jti);
      const rows = await this.db
        .select()
        .from(actionGrants)
        .where(eq(actionGrants.id, grantId));
      const grantRow = rows[0];
      if (!grantRow) {
        throw new UnauthorizedException('Action grant not found');
      }
      if (grantRow.usedAt) {
        throw new UnauthorizedException('Action grant already used');
      }
      if (new Date(grantRow.expiresAt).getTime() < Date.now()) {
        throw new UnauthorizedException('Action grant expired');
      }
      req.grant = {
        jti: grantId,
        staffId: String(payload.staffId),
        deskId: String(payload.deskId),
        deskCode: String(payload.deskCode),
        scope: String(payload.scope ?? 'desk:action'),
      } satisfies GrantClaims;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired action grant');
    }
  }
}
