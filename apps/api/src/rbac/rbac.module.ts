import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CurrentUser } from './current-user.decorator';
import { RolesGuard } from './roles.guard';

// RolesGuard runs globally but only enforces on routes carrying @Roles(...)
// metadata — public routes (login, pin-verify, health, SSE) stay open.
@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class RbacModule {
  static decorator = CurrentUser;
}
