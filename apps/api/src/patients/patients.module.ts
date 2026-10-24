import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [RealtimeModule, AuditModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
