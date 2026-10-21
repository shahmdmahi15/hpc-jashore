import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DbModule } from '../db/db.module';
import { TvController } from './tv.controller';
import { TvService } from './tv.service';

@Module({
  imports: [DbModule, AuditModule],
  controllers: [TvController],
  providers: [TvService],
  exports: [TvService],
})
export class TvModule {}
