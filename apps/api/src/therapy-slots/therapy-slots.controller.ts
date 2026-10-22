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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { extractClientIp } from '../common/request-ip';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import {
  BulkUpdateTherapySlotsDto,
  CopyDayScheduleDto,
  CreateTherapyBookingDto,
  RejectExtraSlotDto,
  TherapyAvailabilityQueryDto,
  TherapyBookingQueryDto,
  TherapySlotQueryDto,
  UpdateTherapyBookingDto,
  UpdateTherapySlotDto,
} from './dto';
import { TherapySlotsService } from './therapy-slots.service';

@ApiTags('therapy-slots')
@ApiBearerAuth()
@Controller('therapy-slots')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class TherapySlotsController {
  constructor(private readonly therapySlotsService: TherapySlotsService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  // --- Availability & Booking Endpoints (Declared before :id) ------------------

  @Get('availability')
  @ApiOperation({ summary: 'Get therapy slot availability and remaining capacity for a date' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  getAvailability(@Query() query: TherapyAvailabilityQueryDto) {
    return this.therapySlotsService.getAvailability(query.date);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'List and filter therapy slot bookings' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  listBookings(@Query() query: TherapyBookingQueryDto) {
    return this.therapySlotsService.listBookings(query);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get single therapy slot booking details' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  getBooking(@Param('id') id: string) {
    return this.therapySlotsService.getBooking(id);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Book a therapy slot for a patient' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  createBooking(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTherapyBookingDto,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.createBooking(
      { sub: user.sub, role: user.role },
      dto,
      this.meta(req),
    );
  }

  @Patch('bookings/:id')
  @ApiOperation({ summary: 'Update therapy slot booking status, told time or notes' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  updateBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTherapyBookingDto,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.updateBooking(
      { sub: user.sub, role: user.role },
      id,
      dto,
      this.meta(req),
    );
  }

  @Post('bookings/:id/approve')
  @ApiOperation({ summary: 'Approve an extra capacity standby therapy slot booking (doctor/admin)' })
  @Roles('admin', 'doctor')
  approveBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.approveBooking(
      { sub: user.sub, role: user.role },
      id,
      this.meta(req),
    );
  }

  @Post('bookings/:id/reject')
  @ApiOperation({ summary: 'Reject an extra capacity standby therapy slot booking with reason (doctor/admin)' })
  @Roles('admin', 'doctor')
  rejectBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RejectExtraSlotDto,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.rejectBooking(
      { sub: user.sub, role: user.role },
      id,
      dto.reason,
      this.meta(req),
    );
  }

  @Delete('bookings/:id')
  @ApiOperation({ summary: 'Cancel/Delete therapy slot booking' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  deleteBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.deleteBooking(
      { sub: user.sub, role: user.role },
      id,
      this.meta(req),
    );
  }

  @Post('bookings/:id/restore')
  @ApiOperation({ summary: 'Restore a cancelled therapy slot booking' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  restoreBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.restoreBooking(
      { sub: user.sub, role: user.role },
      id,
      this.meta(req),
    );
  }

  // --- Slot Configuration Endpoints ------------------------------------------

  @Get()
  @ApiOperation({ summary: 'List therapy slot configurations with KPI summary' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  list(@Query() query: TherapySlotQueryDto) {
    return this.therapySlotsService.list(query);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update multiple therapy slot capacities' })
  @Roles('admin')
  bulkUpdate(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkUpdateTherapySlotsDto,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.bulkUpdate(
      { sub: user.sub, role: user.role },
      dto,
      this.meta(req),
    );
  }

  @Post('copy-day')
  @ApiOperation({ summary: 'Copy full 24-hour schedule from one day to other days' })
  @Roles('admin')
  copyDay(
    @CurrentUser() user: RequestUser,
    @Body() dto: CopyDayScheduleDto,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.copyDaySchedule(
      { sub: user.sub, role: user.role },
      dto,
      this.meta(req),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single therapy slot configuration' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  get(@Param('id') id: string) {
    return this.therapySlotsService.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update therapy slot capacity, active status and notes' })
  @Roles('admin')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTherapySlotDto,
    @Req() req: Request,
  ) {
    return this.therapySlotsService.update(
      { sub: user.sub, role: user.role },
      id,
      dto,
      this.meta(req),
    );
  }
}
