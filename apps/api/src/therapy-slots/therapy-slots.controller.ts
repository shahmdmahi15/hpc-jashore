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
  TherapySlotQueryDto,
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

  @Get()
  @ApiOperation({ summary: 'List therapy slot configurations with KPI summary' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  list(@Query() query: TherapySlotQueryDto) {
    return this.therapySlotsService.list(query);
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
}
