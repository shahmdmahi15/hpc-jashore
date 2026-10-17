import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

// Enforces @Roles(...) against req.user.role (set by JwtAuthGuard).
// head_doctor inherits every doctor-scoped route: declare both roles explicitly
// on doctor routes OR list ['doctor','head_doctor'] — never bypass silently.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = ctx.switchToHttp().getRequest();
    const role = req.user?.role as string | undefined;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException('Insufficient role for this resource');
    }
    return true;
  }
}
