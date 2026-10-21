import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { extractClientIp } from '../common/request-ip';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { DesksService } from './desks.service';
import { CreateDeskDto, UpdateDeskDto } from './dto';

@ApiTags('desks')
@ApiBearerAuth()
@Controller('desks')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class DesksController {
  constructor(private readonly desks: DesksService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  list() {
    return this.desks.list();
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDeskDto, @Req() req: Request) {
    return this.desks.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Patch(':id')
  @Roles('admin')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateDeskDto, @Req() req: Request) {
    return this.desks.update({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }
}
