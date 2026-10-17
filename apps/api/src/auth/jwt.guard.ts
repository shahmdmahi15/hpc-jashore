import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guards: JwtAccessAuthGuard (Bearer access token), JwtRefreshAuthGuard
// (refresh cookie/body). Attach req.user via the matching strategy.
@Injectable()
export class JwtAccessAuthGuard extends AuthGuard('jwt-access' as any) {}

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh' as any) {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

