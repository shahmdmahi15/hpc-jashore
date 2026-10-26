import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { extractClientIp } from '../common/request-ip';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import {
  CallTherapyPatientDto,
  CancelTherapyCallDto,
  CompleteSessionDto,
  CreateMachineDto,
  CreatePackageDto,
  MarkInTherapyDto,
  PurchasePackageDto,
  RecallTherapyPatientDto,
  StartSessionDto,
} from './dto';
import { TherapyService } from './therapy.service';

@ApiTags('therapy')
@ApiBearerAuth()
@Controller('therapy')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class TherapyController {
  constructor(private readonly therapy: TherapyService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Post('sessions/start')
  @Roles('admin', 'doctor', 'handler')
  startSession(
    @CurrentUser() user: RequestUser,
    @Body() dto: StartSessionDto,
    @Req() req: Request,
  ) {
    const therapistStaffId = user.staffId ?? user.sub;
    return this.therapy.startSession(
      { sub: user.sub, role: user.role },
      therapistStaffId,
      dto,
      this.meta(req),
    );
  }

  @Post('sessions/:id/complete')
  @Roles('admin', 'doctor', 'handler')
  completeSession(
    @CurrentUser() user: RequestUser,
    @Param('id') sessionId: string,
    @Body() dto: CompleteSessionDto,
    @Req() req: Request,
  ) {
    return this.therapy.completeSession(
      { sub: user.sub, role: user.role },
      sessionId,
      dto,
      this.meta(req),
    );
  }

  @Get('sessions/today')
  getTodaySessions(@Query('therapistStaffId') therapistStaffId?: string) {
    return this.therapy.getTodaySessions(therapistStaffId);
  }

  @Get('queue')
  @Roles('admin', 'doctor', 'cashier', 'receptionist', 'handler')
  getQueue() {
    return this.therapy.getQueue();
  }

  @Get('rooms')
  @Roles('admin', 'doctor', 'cashier', 'receptionist', 'handler')
  getRooms() {
    return this.therapy.getRooms();
  }

  @Post('call-patient')
  @Roles('admin', 'doctor', 'cashier', 'receptionist', 'handler')
  callPatient(
    @CurrentUser() user: RequestUser,
    @Body() dto: CallTherapyPatientDto,
    @Req() req: Request,
  ) {
    return this.therapy.callPatient({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Post('mark-in-therapy')
  @Roles('admin', 'doctor', 'cashier', 'receptionist', 'handler')
  markInTherapy(
    @CurrentUser() user: RequestUser,
    @Body() dto: MarkInTherapyDto,
    @Req() req: Request,
  ) {
    return this.therapy.markInTherapy({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Post('recall-patient')
  @Roles('admin', 'doctor', 'cashier', 'receptionist', 'handler')
  recallPatient(
    @CurrentUser() user: RequestUser,
    @Body() dto: RecallTherapyPatientDto,
    @Req() req: Request,
  ) {
    return this.therapy.recallPatient({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Post('cancel-call')
  @Roles('admin', 'doctor', 'cashier', 'receptionist', 'handler')
  cancelCall(
    @CurrentUser() user: RequestUser,
    @Body() dto: CancelTherapyCallDto,
    @Req() req: Request,
  ) {
    return this.therapy.cancelCall({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get('occupancy')
  getOccupancy() {
    return this.therapy.getOccupancy();
  }

  @Get('beds')
  listBeds() {
    return [];
  }

  @Get('machines')
  listMachines() {
    return this.therapy.listMachines();
  }

  @Post('machines')
  @Roles('admin')
  createMachine(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMachineDto,
    @Req() req: Request,
  ) {
    return this.therapy.createMachine({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get('packages')
  listPackages() {
    return this.therapy.listPackages();
  }

  @Post('packages')
  @Roles('admin')
  createPackage(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePackageDto,
    @Req() req: Request,
  ) {
    return this.therapy.createPackage({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Post('packages/purchase')
  @Roles('admin', 'doctor', 'cashier', 'receptionist')
  purchasePackage(
    @CurrentUser() user: RequestUser,
    @Body() dto: PurchasePackageDto,
    @Req() req: Request,
  ) {
    return this.therapy.purchasePackage({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get('packages/patient/:patientId')
  @Roles('admin', 'doctor', 'cashier', 'receptionist', 'handler')
  getPatientCredits(@Param('patientId') patientId: string) {
    return this.therapy.getPatientCredits(patientId);
  }
}
