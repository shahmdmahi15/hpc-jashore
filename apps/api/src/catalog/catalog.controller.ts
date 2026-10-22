import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { extractClientIp } from '../common/request-ip';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CatalogService } from './catalog.service';
import { CreateModalityDto, UpdateModalityDto } from './dto';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get('modalities')
  modalities() {
    return this.catalog.listModalities();
  }

  @Post('modalities')
  @Roles('admin')
  createModality(@CurrentUser() user: RequestUser, @Body() dto: CreateModalityDto, @Req() req: Request) {
    return this.catalog.createModality({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Patch('modalities/:id')
  @Roles('admin')
  updateModality(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateModalityDto,
    @Req() req: Request,
  ) {
    return this.catalog.updateModality({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }
}
