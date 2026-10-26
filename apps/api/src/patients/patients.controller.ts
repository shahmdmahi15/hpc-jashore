import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { extractClientIp } from '../common/request-ip';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import {
  CreatePatientDto,
  UpdatePatientDto,
  CreateIntakeFormDto,
  AdmitToQueueDto,
  CreateTimelineEventDto,
  CreateAssessmentFileDto,
  UpdateAssessmentFileDto,
} from './dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  @ApiQuery({ name: 'q', required: false, description: 'Search MRN, name, phone, email, or occupation' })
  @ApiQuery({ name: 'search', required: false, description: 'Alias for q' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(
    @Query('q') qParam?: string,
    @Query('search') searchParam?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const q = (qParam || searchParam || '').trim() || undefined;
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;
    return this.patients.search(q, pageNum, limitNum);
  }

  @Post()
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePatientDto,
    @Req() req: Request,
  ) {
    return this.patients.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Post('intake-form')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  createIntakeForm(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateIntakeFormDto,
    @Req() req: Request,
  ) {
    return this.patients.createIntakeForm({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get('intake-forms')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  listIntakeForms(
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('search') search?: string,
  ) {
    return this.patients.listIntakeForms({ date, status, doctorId, patientId, search });
  }

  @Get('intake-form/:id')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  getIntakeForm(@Param('id') id: string) {
    return this.patients.getIntakeForm(id);
  }

  @Post('intake-form/:id/forward-to-cashier')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  forwardToCashier(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.patients.forwardIntakeFormToCashier({ sub: user.sub, role: user.role }, id, this.meta(req));
  }

  @Post('intake-form/:id/admit-to-queue')
  @Roles('admin', 'cashier', 'receptionist', 'doctor')
  admitToQueue(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AdmitToQueueDto,
    @Req() req: Request,
  ) {
    return this.patients.admitIntakeFormToQueue({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Get(':id/timeline')
  getTimeline(
    @Param('id') patientId: string,
    @Query('date') date?: string,
  ) {
    return this.patients.getPatientTimeline(patientId, date);
  }

  @Post(':id/timeline')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  addTimelineEvent(
    @CurrentUser() user: RequestUser,
    @Param('id') patientId: string,
    @Body() dto: CreateTimelineEventDto,
  ) {
    return this.patients.addPatientTimelineEvent({
      patientId,
      step: dto.step,
      titleEn: dto.titleEn,
      titleBn: dto.titleBn,
      descriptionEn: dto.descriptionEn,
      descriptionBn: dto.descriptionBn,
      visitId: dto.visitId,
      intakeFormId: dto.intakeFormId,
      metadataJson: dto.metadataJson,
      actorId: user.sub,
      actorRole: user.role,
    });
  }

  @Get('assessment-files/:fileId')
  getAssessmentFile(@Param('fileId') fileId: string) {
    return this.patients.getAssessmentFile(fileId);
  }

  @Patch('assessment-files/:fileId')
  @Roles('admin', 'doctor', 'receptionist', 'handler')
  updateAssessmentFile(
    @CurrentUser() user: RequestUser,
    @Param('fileId') fileId: string,
    @Body() dto: UpdateAssessmentFileDto,
  ) {
    return this.patients.updateAssessmentFile(fileId, dto, user);
  }

  @Get(':id/assessment-files')
  listAssessmentFiles(@Param('id') patientId: string) {
    return this.patients.listAssessmentFiles(patientId);
  }

  @Post(':id/assessment-files')
  @Roles('admin', 'doctor', 'receptionist', 'handler')
  createAssessmentFile(
    @CurrentUser() user: RequestUser,
    @Param('id') patientId: string,
    @Body() dto: CreateAssessmentFileDto,
  ) {
    return this.patients.createAssessmentFile(patientId, dto, user);
  }

  @Get(':id/clinical-status')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  getClinicalStatus(@Param('id') id: string) {
    return this.patients.getClinicalStatus(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.patients.get(id);
  }

  @Patch(':id')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @Req() req: Request,
  ) {
    return this.patients.update({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Delete(':id')
  @Roles('admin')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.patients.remove({ sub: user.sub, role: user.role }, id, this.meta(req));
  }
}
