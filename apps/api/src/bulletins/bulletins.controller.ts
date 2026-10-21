// apps/api/src/bulletins/bulletins.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { BulletinsService } from './bulletins.service';
import { CreateBulletinDto, UpdateBulletinDto } from './dto';

@ApiTags('bulletins')
@Controller('bulletins')
export class BulletinsController {
  constructor(private readonly bulletins: BulletinsService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  // Public endpoint for TV and Waiting Screen marquee
  @Get('active')
  listActive() {
    return this.bulletins.listActive();
  }

  // Admin endpoints
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  listAll() {
    return this.bulletins.listAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBulletinDto,
    @Req() req: Request,
  ) {
    return this.bulletins.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBulletinDto,
    @Req() req: Request,
  ) {
    return this.bulletins.update({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  delete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.bulletins.delete({ sub: user.sub, role: user.role }, id, this.meta(req));
  }
}
