import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { UpsertSettingDto } from './dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  all() {
    return this.settings.all();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @Put(':key')
  @Roles('admin')
  put(@CurrentUser() user: RequestUser, @Param('key') key: string, @Body() dto: UpsertSettingDto, @Req() req: Request) {
    return this.settings.put(
      { sub: user.sub, role: user.role },
      key,
      dto.valueJson,
      {
        ip: (req.ip ?? null) as string | null,
        requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
      },
    );
  }
}
