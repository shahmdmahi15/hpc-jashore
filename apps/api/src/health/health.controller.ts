import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';

@Controller()
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get(['healthz', 'health'])
  healthz() {
    try {
      this.db.run(sql`SELECT 1`);
      return {
        status: 'ok',
        database: 'connected',
        service: 'hpc-api',
        time: new Date().toISOString(),
      };
    } catch (err: any) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        error: err.message,
        time: new Date().toISOString(),
      });
    }
  }

  @Get('version')
  version() {
    return {
      service: 'hpc-api',
      // Bumped by CI on every deploy; falls back for local dev.
      version: process.env.APP_VERSION ?? '0.1.0-dev',
      proto: 1,
    };
  }
}
