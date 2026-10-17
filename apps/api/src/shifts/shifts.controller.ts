import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CreateShiftDto, UpdateShiftDto } from './dto';
import { ShiftsService } from './shifts.service';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  private meta(req: Request) {
    return {
      ip: (req.ip ?? null) as string | null,
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  list(@Query('date') date?: string) {
    return this.shifts.listForDate(date);
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateShiftDto, @Req() req: Request) {
    return this.shifts.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Patch(':id')
  @Roles('admin')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateShiftDto, @Req() req: Request) {
    return this.shifts.update({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Delete(':id')
  @Roles('admin')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.shifts.remove({ sub: user.sub, role: user.role }, id, this.meta(req));
  }
}
