import {
  CallHandler,
  ExecutionContext,
  Global,
  Injectable,
  Module,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditService } from './audit.service';

// Pass-through interceptor reserved for request-scoped audit context
// (timing, request-id propagation). Actual audit rows are written explicitly
// by services via AuditService.log() so before/after payloads are exact.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle();
  }
}

@Global()
@Module({
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
