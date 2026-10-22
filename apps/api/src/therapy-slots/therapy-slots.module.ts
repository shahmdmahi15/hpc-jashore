import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DbModule } from '../db/db.module';
import { TherapySlotsController } from './therapy-slots.controller';
import { TherapySlotsService } from './therapy-slots.service';

@Module({
  imports: [DbModule, AuditModule],
  controllers: [TherapySlotsController],
  providers: [TherapySlotsService],
  exports: [TherapySlotsService],
})
export class TherapySlotsModule {}
