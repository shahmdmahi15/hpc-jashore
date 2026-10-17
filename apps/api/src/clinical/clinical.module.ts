import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';

@Module({
  imports: [RealtimeModule],
  controllers: [ClinicalController],
  providers: [ClinicalService],
  exports: [ClinicalService],
})
export class ClinicalModule {}
