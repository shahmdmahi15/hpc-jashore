import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  sub: string;
  email: string;
  role: string;
  staffId: string | null;
  sid?: string | null;
}

// Reads req.user set by JwtAuthGuard (passport 'jwt-access').
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as RequestUser;
  },
);
