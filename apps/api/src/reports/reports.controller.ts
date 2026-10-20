import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('today')
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  getToday(@Query('date') date?: string) {
    return this.reports.getDailySummary(date);
  }

  @Get('daily-summary')
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  getDailySummary(@Query('date') date?: string) {
    return this.reports.getDailySummary(date);
  }

  @Get('modalities')
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  getModalities(@Query('date') date?: string) {
    return this.reports.getModalityStats(date);
  }

  @Get('doctors')
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  getDoctors(@Query('date') date?: string) {
    return this.reports.getDoctorStats(date);
  }

  @Get('doctor-income')
  @Roles('admin', 'doctor')
  getDoctorIncome() {
    return this.reports.getDoctorIncomeReport();
  }

  @Get('therapist-performance')
  @Roles('admin', 'doctor')
  getTherapistPerformance() {
    return this.reports.getTherapistPerformance();
  }

  @Get('handler-performance')
  @Roles('admin', 'doctor')
  getHandlerPerformance() {
    return this.reports.getTherapistPerformance();
  }

  @Get('pnl')
  @Roles('admin')
  getPnl() {
    return this.reports.getPnlSummary();
  }

  @Get('feedback')
  @Roles('admin', 'doctor')
  getFeedback() {
    return this.reports.getFeedbackSummary();
  }
}
