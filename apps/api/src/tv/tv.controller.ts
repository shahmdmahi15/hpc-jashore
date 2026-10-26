import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { extractClientIp } from '../common/request-ip';
import { RolesGuard } from '../rbac/roles.guard';
import { HeartbeatTvDto, PairTvDto, RegisterTvDto, UpdateTvDto } from './dto';
import { TvService } from './tv.service';

@ApiTags('tv')
@Controller('tv')
export class TvController {
  constructor(private readonly tv: TvService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  // --- Public Endpoints (TV Android App / Screen Display) ---------------------

  @Post('register')
  @HttpCode(HttpStatus.OK)
  register(@Body() dto: RegisterTvDto, @Req() req: Request) {
    return this.tv.registerTv(dto, this.meta(req));
  }

  @Get('status/:pairingCode')
  status(@Param('pairingCode') pairingCode: string) {
    return this.tv.getTvStatus(pairingCode);
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
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

  @Get('bulletins')
  getBulletins() {
    return this.tv.getActiveBulletins();
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @Post('devices/:id/force-update')
  @HttpCode(HttpStatus.OK)
  setForceUpdate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { force?: boolean },
    @Req() req: Request,
  ) {
    return this.tv.setForceUpdate(
      { sub: user.sub, role: user.role },
      id,
      body.force !== false,
      this.meta(req),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('devices/:id/restart')
  @HttpCode(HttpStatus.OK)
  restartDevice(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.tv.restartDevice({ sub: user.sub, role: user.role }, id, this.meta(req));
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
