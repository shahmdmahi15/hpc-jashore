// apps/api/src/consultation-bookings/consultation-bookings.module.ts
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DbModule } from '../db/db.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ConsultationBookingsController } from './consultation-bookings.controller';
import { ConsultationBookingsService } from './consultation-bookings.service';

@Module({
  imports: [DbModule, AuditModule, RealtimeModule],
  controllers: [ConsultationBookingsController],
  providers: [ConsultationBookingsService],
  exports: [ConsultationBookingsService],
})
export class ConsultationBookingsModule {}
