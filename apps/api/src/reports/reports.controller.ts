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
@Roles('admin', 'head_doctor')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('daily-summary')
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  getDailySummary(@Query('date') date?: string) {
    return this.reports.getDailySummary(date);
  }

  @Get('doctor-income')
  getDoctorIncome() {
    return this.reports.getDoctorIncomeReport();
  }

  @Get('therapist-performance')
  getTherapistPerformance() {
    return this.reports.getTherapistPerformance();
  }

  @Get('pnl')
  getPnl() {
    return this.reports.getPnlSummary();
  }

  @Get('feedback')
  getFeedback() {
    return this.reports.getFeedbackSummary();
  }
}
