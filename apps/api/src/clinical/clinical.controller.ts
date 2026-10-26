import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { extractClientIp } from '../common/request-ip';
import { RolesGuard } from '../rbac/roles.guard';
import { ClinicalService } from './clinical.service';
import {
  CreateAssessmentDto,
  CreateConsultationDto,
  CreateStandalonePrescriptionDto,
} from './dto';

@ApiTags('clinical')
@ApiBearerAuth()
@Controller('clinical')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class ClinicalController {
  constructor(private readonly clinical: ClinicalService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Post('consultations')
  @Roles('admin', 'doctor')
  createConsultation(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateConsultationDto,
    @Req() req: Request,
  ) {
    const doctorId = user.staffId ?? user.sub;
    return this.clinical.createConsultation(
      { sub: user.sub, role: user.role },
      doctorId,
      dto,
      this.meta(req),
    );
  }

  @Get('consultations/:id')
  getConsultation(@Param('id') id: string) {
    return this.clinical.getConsultation(id);
  }

  @Get('consultations/patient/:patientId')
  getPatientConsultations(@Param('patientId') patientId: string) {
    return this.clinical.getPatientConsultations(patientId);
  }

  @Get('prescriptions')
  listPrescriptions() {
    return this.clinical.listPrescriptions();
  }

  @Get('prescriptions/patient/:patientId')
  getPatientPrescriptions(@Param('patientId') patientId: string) {
    return this.clinical.getPatientPrescriptions(patientId);
  }

  @Get('prescriptions/:id')
  getPrescription(@Param('id') id: string) {
    return this.clinical.getPrescription(id);
  }

  @Post('prescriptions')
  @Roles('admin', 'doctor')
  createPrescription(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateStandalonePrescriptionDto,
    @Req() req: Request,
  ) {
    const doctorId = user.staffId ?? user.sub;
    return this.clinical.createPrescription(
      { sub: user.sub, role: user.role },
      doctorId,
      dto,
      this.meta(req),
    );
  }

  @Post('assessments')
  @Roles('admin', 'doctor', 'handler')
  createAssessment(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAssessmentDto,
    @Req() req: Request,
  ) {
    return this.clinical.createAssessment(
      { sub: user.sub, role: user.role },
      dto,
      this.meta(req),
    );
  }

  @Get('assessments/patient/:patientId')
  getPatientAssessments(@Param('patientId') patientId: string) {
    return this.clinical.getPatientAssessments(patientId);
  }
}
