import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CallSerialDto, CheckInDto, CheckOutDto, RoutePatientDto } from './dto';
import { VisitsService } from './visits.service';

@ApiTags('visits')
@Controller('visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  private meta(req: Request) {
    return {
      ip: (req.ip ?? null) as string | null,
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Post('check-in')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'doctor', 'receptionist')
  checkIn(
    @CurrentUser() user: RequestUser,
    @Body() dto: CheckInDto,
    @Req() req: Request,
  ) {
    return this.visits.checkIn({ sub: user.sub, role: user.role }, dto, this.meta(req));
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

  @Post(':id/check-out')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin', 'receptionist', 'cashier')
  checkOut(
    @Param('id') visitId: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.visits.checkOut(visitId, dto);
  }

  @Get('tv/snapshot')
  tvSnapshot() {
    return this.visits.getTvSnapshot();
  }
}
