import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { PresenceController } from './presence.controller';
import { RealtimeService } from './realtime.service';
import { SseController } from './sse.controller';

// Global: feature modules emit realtime events via RealtimeService.publish()
// without importing the whole module.
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [SseController, PresenceController],
  providers: [EventsGateway, RealtimeService],
  exports: [EventsGateway, RealtimeService],
})
export class RealtimeModule {}
