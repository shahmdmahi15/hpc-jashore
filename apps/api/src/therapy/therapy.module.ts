import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { TherapyController } from './therapy.controller';
import { TherapyService } from './therapy.service';

@Module({
  imports: [RealtimeModule],
  controllers: [TherapyController],
  providers: [TherapyService],
  exports: [TherapyService],
})
export class TherapyModule {}
