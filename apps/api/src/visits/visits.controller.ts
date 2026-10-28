import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
  CallSerialDto,
  CheckInDto,
  CheckOutDto,
  RoutePatientDto,
  SendToDoctorQueueDto,
  SendToTherapyQueueDto,
  RequestConsultationAdjustmentDto,
  ProcessConsultationAdjustmentDto,
} from './dto';
import { VisitsService } from './visits.service';

@ApiTags('visits')
@Controller('visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Post('check-in')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'receptionist', 'doctor', 'cashier', 'handler')
  checkIn(
    @CurrentUser() user: RequestUser,
    @Body() dto: CheckInDto,
    @Req() req: Request,
  ) {
    return this.visits.checkIn({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get('checkin/overview')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'receptionist', 'doctor', 'cashier', 'handler')
  checkinOverview() {
    return this.visits.getCheckinOverview();
  }

  @Get('checkout/active')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'receptionist', 'doctor', 'cashier', 'handler')
  checkoutActive(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.visits.getCheckoutActiveVisits(search, status);
  }

  @Get('today')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard)
  today() {
    return this.visits.getTodayVisits();
  }

  @Get('doctor/:doctorId/queue')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard)
  queue(@Param('doctorId') doctorId: string) {
    return this.visits.getDoctorQueue(doctorId);
  }

  @Post('doctor/:doctorId/call-next')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  callNext(
    @Param('doctorId') doctorId: string,
    @Body() dto: CallSerialDto,
  ) {
    return this.visits.callNext(doctorId, undefined, dto);
  }

  @Post('serials/:id/call')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  callSerial(
    @Param('id') serialId: string,
    @Body() dto: CallSerialDto,
  ) {
    return this.visits.callNext('', serialId, dto);
  }

  @Post('serials/:id/recall')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  recallSerial(
    @Param('id') serialId: string,
    @Body() dto: CallSerialDto,
  ) {
    return this.visits.recallSerial('', serialId, dto);
  }

  @Post('serials/:id/mark-in-consultation')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  markInConsultation(@Param('id') serialId: string) {
    return this.visits.markInConsultation(serialId);
  }

  @Post('serials/:id/cancel-call')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  cancelCall(@Param('id') serialId: string) {
    return this.visits.cancelCall(serialId);
  }

  @Post('serials/:id/complete')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  completeSerial(@Param('id') serialId: string) {
    return this.visits.completeSerial(serialId);
  }

  @Post('serials/:id/skip')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  skipSerial(@Param('id') serialId: string) {
    return this.visits.skipSerial(serialId);
  }

  @Patch(':id/route')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard)
  routePatient(
    @Param('id') visitId: string,
    @Body() dto: RoutePatientDto,
  ) {
    return this.visits.routePatient(visitId, dto);
  }

  @Post(':id/send-to-doctor-queue')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'receptionist', 'cashier', 'doctor', 'handler')
  sendToDoctorQueue(
    @CurrentUser() user: RequestUser,
    @Param('id') visitId: string,
    @Body() dto: SendToDoctorQueueDto,
    @Req() req: Request,
  ) {
    return this.visits.sendToDoctorQueue(
      { sub: user.sub, role: user.role },
      visitId,
      dto,
      this.meta(req),
    );
  }

  @Post(':id/send-to-therapy-queue')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'receptionist', 'cashier', 'doctor', 'handler')
  sendToTherapyQueue(
    @CurrentUser() user: RequestUser,
    @Param('id') visitId: string,
    @Body() dto: SendToTherapyQueueDto,
    @Req() req: Request,
  ) {
    return this.visits.sendToTherapyQueue(
      { sub: user.sub, role: user.role },
      visitId,
      dto,
      this.meta(req),
    );
  }

  @Post(':id/check-out')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'receptionist', 'cashier', 'doctor')
  checkOut(
    @CurrentUser() user: RequestUser,
    @Param('id') visitId: string,
    @Body() dto: CheckOutDto,
    @Req() req: Request,
  ) {
    return this.visits.checkOut(
      { sub: user.sub, role: user.role },
      visitId,
      dto,
      this.meta(req),
    );
  }

  @Get(':id/departure-slip')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'receptionist', 'cashier', 'doctor', 'handler')
  departureSlip(@Param('id') visitId: string) {
    return this.visits.getDepartureSlip(visitId);
  }

  @Get('tv/snapshot')
  tvSnapshot() {
    return this.visits.getTvSnapshot();
  }

  @Post(':id/consultation-adjustment/request')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  requestConsultationAdjustment(
    @CurrentUser() user: RequestUser,
    @Param('id') visitId: string,
    @Body() dto: RequestConsultationAdjustmentDto,
  ) {
    return this.visits.requestConsultationAdjustment(
      { sub: user.sub, role: user.role },
      visitId,
      dto,
    );
  }

  @Post(':id/consultation-adjustment/process')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  processConsultationAdjustment(
    @CurrentUser() user: RequestUser,
    @Param('id') visitId: string,
    @Body() dto: ProcessConsultationAdjustmentDto,
  ) {
    return this.visits.processConsultationAdjustment(
      { sub: user.sub, role: user.role },
      visitId,
      dto,
    );
  }
}
