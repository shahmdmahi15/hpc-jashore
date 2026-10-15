import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('healthz')
  healthz() {
    return {
      status: 'ok',
      service: 'hpc-api',
      time: new Date().toISOString(),
    };
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
