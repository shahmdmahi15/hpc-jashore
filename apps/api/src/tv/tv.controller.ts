import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { HeartbeatTvDto, PairTvDto, RegisterTvDto, UpdateTvDto } from './dto';
import { TvService } from './tv.service';

@ApiTags('tv')
@Controller('tv')
export class TvController {
  constructor(private readonly tv: TvService) {}

  private meta(req: Request) {
    return {
      ip: (req.ip ?? null) as string | null,
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  // --- Public Endpoints (TV Android App / Screen Display) ---------------------

  @Post('register')
  register(@Body() dto: RegisterTvDto, @Req() req: Request) {
    return this.tv.registerTv(dto, this.meta(req));
  }

  @Get('status/:pairingCode')
  status(@Param('pairingCode') pairingCode: string) {
    return this.tv.getTvStatus(pairingCode);
  }

  @Post('heartbeat')
  heartbeat(
    @Body() dto: HeartbeatTvDto,
    @Headers('x-tv-pairing-code') headerPairingCode: string | undefined,
    @Req() req: Request,
  ) {
    const payload: HeartbeatTvDto = {
      pairingCode: dto.pairingCode || headerPairingCode,
      appVersion: dto.appVersion,
    };
    return this.tv.heartbeat(payload, this.meta(req));
  }

  // --- Protected Admin Endpoints (Workstation Console) -----------------------

  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('devices')
  listDevices() {
    return this.tv.listDevices();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('pair')
  pairDevice(
    @CurrentUser() user: RequestUser,
    @Body() dto: PairTvDto,
    @Req() req: Request,
  ) {
    return this.tv.pairDevice({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('devices/:id')
  updateDevice(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTvDto,
    @Req() req: Request,
  ) {
    return this.tv.updateDevice({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('devices/:id/revoke')
  revokeDevice(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.tv.revokeDevice({ sub: user.sub, role: user.role }, id, this.meta(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('devices/:id')
  deleteDevice(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.tv.deleteDevice({ sub: user.sub, role: user.role }, id, this.meta(req));
  }
}
