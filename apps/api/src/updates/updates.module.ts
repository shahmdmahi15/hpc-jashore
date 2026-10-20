import { Module } from '@nestjs/common';
import { UpdatesController } from './updates.controller';
import { UpdatesService } from './updates.service';
import { UpdateAuthGuard } from './update-auth.guard';

@Module({
  controllers: [UpdatesController],
  providers: [UpdatesService, UpdateAuthGuard],
  exports: [UpdatesService],
})
export class UpdatesModule {}
