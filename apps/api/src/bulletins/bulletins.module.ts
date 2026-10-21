// apps/api/src/bulletins/bulletins.module.ts
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DbModule } from '../db/db.module';
import { BulletinsController } from './bulletins.controller';
import { BulletinsService } from './bulletins.service';

@Module({
  imports: [DbModule, AuditModule],
  controllers: [BulletinsController],
  providers: [BulletinsService],
  exports: [BulletinsService],
})
export class BulletinsModule {}
