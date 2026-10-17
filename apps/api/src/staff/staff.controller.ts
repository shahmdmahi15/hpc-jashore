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
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CreateStaffDto, UpdateStaffDto } from './dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  private meta(req: Request) {
    return {
      ip: (req.ip ?? null) as string | null,
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  @Roles('admin', 'head_doctor')
  list() {
    return this.staff.list();
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateStaffDto, @Req() req: Request) {
    return this.staff.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get(':id')
  async get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    // Privileged roles see any row; everyone else only their own linked row.
    if (user.role !== 'admin' && user.role !== 'head_doctor') {
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
