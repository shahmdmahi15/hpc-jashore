import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AuditModule } from './audit/audit.module';
import { AuditQueryModule } from './audit/audit-query.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CatalogModule } from './catalog/catalog.module';
import { ClinicalModule } from './clinical/clinical.module';
import configuration from './config/configuration';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { DbModule } from './db/db.module';
import { DesksModule } from './desks/desks.module';
import { HealthController } from './health/health.controller';
import { InventoryModule } from './inventory/inventory.module';
import { PatientsModule } from './patients/patients.module';
import { RbacModule } from './rbac/rbac.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { ShiftsModule } from './shifts/shifts.module';
import { StaffModule } from './staff/staff.module';
import { TherapyModule } from './therapy/therapy.module';
import { UsersModule } from './users/users.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DbModule,
    AuditModule,
    AuditQueryModule,
    AuthModule,
    RbacModule,
    UsersModule,
    StaffModule,
    DesksModule,
    ShiftsModule,
    CatalogModule,
    SettingsModule,
    RealtimeModule,
    PatientsModule,
    VisitsModule,
    ClinicalModule,
    TherapyModule,
    BillingModule,
    InventoryModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(cookieParser(), RequestIdMiddleware)
      .forRoutes('*');
  }
}
