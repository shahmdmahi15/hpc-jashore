import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [RealtimeModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
