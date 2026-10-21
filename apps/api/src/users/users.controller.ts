import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { extractClientIp } from '../common/request-ip';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto, @Req() req: Request) {
    return this.users.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get('sessions/all')
  listSessions() {
    return this.users.listSessions();
  }

  @Delete('sessions/:id')
  revokeSession(@CurrentUser() user: RequestUser, @Param('id') sessionId: string, @Req() req: Request) {
    return this.users.revokeSession({ sub: user.sub, role: user.role }, sessionId, this.meta(req));
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    return this.users.update({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.users.remove({ sub: user.sub, role: user.role }, id, this.meta(req));
  }
}
