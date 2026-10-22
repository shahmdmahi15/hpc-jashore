// apps/api/src/consultation-bookings/consultation-bookings.controller.ts
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
  CancelConsultationBookingDto,
  CheckInConsultationBookingDto,
  CreateConsultationBookingDto,
  ListConsultationBookingsQueryDto,
  SendToDoctorQueueDto,
} from './dto';
import { ConsultationBookingsService } from './consultation-bookings.service';

@ApiTags('consultation-bookings')
@ApiBearerAuth()
@Controller('consultation-bookings')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class ConsultationBookingsController {
  constructor(private readonly service: ConsultationBookingsService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  list(@Query() query: ListConsultationBookingsQueryDto) {
    return this.service.list(query);
  }

  @Get('slots')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  getSlots(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.service.getDoctorSlots(doctorId, date);
  }

  @Post()
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateConsultationBookingDto,
    @Req() req: Request,
  ) {
    return this.service.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Post(':id/check-in')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  checkIn(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CheckInConsultationBookingDto,
    @Req() req: Request,
  ) {
    return this.service.checkInBooking(
      { sub: user.sub, role: user.role },
      id,
      dto.toldTime,
      dto.notes,
      this.meta(req),
    );
  }

  @Post(':id/queue')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  sendToQueue(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SendToDoctorQueueDto,
    @Req() req: Request,
  ) {
    return this.service.sendToQueue(
      { sub: user.sub, role: user.role },
      id,
      dto,
      this.meta(req),
    );
  }

  @Post(':id/cancel')
  @Roles('admin', 'doctor', 'receptionist', 'cashier', 'handler')
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CancelConsultationBookingDto,
    @Req() req: Request,
  ) {
    return this.service.cancel(
      { sub: user.sub, role: user.role },
      id,
      dto,
      this.meta(req),
    );
  }
}
