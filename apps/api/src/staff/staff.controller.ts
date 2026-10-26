import {
  Body,
  Controller,
  ForbiddenException,
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
import { extractClientIp } from '../common/request-ip';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import {
  CreateDoctorDto,
  CreateStaffDto,
  UpdateDoctorConfigDto,
  UpdateStaffDto,
} from './dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  list() {
    return this.staff.list();
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateStaffDto, @Req() req: Request) {
    return this.staff.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  // --- Doctor Configuration Endpoints ---
  @Get('doctors')
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  listDoctors() {
    return this.staff.listDoctors();
  }

  @Get('doctors/:id')
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  getDoctor(@Param('id') id: string) {
    return this.staff.getDoctor(id);
  }

  @Post('doctors')
  @Roles('admin')
  createDoctor(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDoctorDto,
    @Req() req: Request,
  ) {
    return this.staff.createDoctor({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Patch('doctors/:id')
  @Roles('admin')
  updateDoctor(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorConfigDto,
    @Req() req: Request,
  ) {
    return this.staff.updateDoctor({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Get(':id')
  async get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    // Privileged roles see any row; everyone else only their own linked row.
    if (user.role !== 'admin' && user.role !== 'doctor') {
      const ownId = user.staffId ?? (await this.staff.staffIdForUser(user.sub));
      if (ownId !== id) throw new ForbiddenException('Can only view your own staff record');
    }
    return this.staff.get(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @Req() req: Request,
  ) {
    return this.staff.update({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }
}
