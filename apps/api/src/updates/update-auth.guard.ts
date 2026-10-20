import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class UpdateAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const secretFromEnv =
      this.config.get<string>('UPDATE_WEBHOOK_SECRET') ??
      process.env.UPDATE_WEBHOOK_SECRET;

    const nodeEnv =
      this.config.get<string>('nodeEnv') ?? process.env.NODE_ENV ?? 'development';
    const effectiveSecret =
      secretFromEnv || (nodeEnv !== 'production' ? 'dev-update-secret' : null);

    if (!effectiveSecret) {
      throw new UnauthorizedException(
        'UPDATE_WEBHOOK_SECRET is not configured in production.',
      );
    }

    const headerSecret = req.header('x-update-secret');
    const authHeader = req.header('authorization');
    let bearerToken: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.slice(7).trim();
    }

    const provided = headerSecret ?? bearerToken;
    if (!provided || provided !== effectiveSecret) {
      throw new UnauthorizedException('Invalid or missing update secret.');
    }

    return true;
  }
}
